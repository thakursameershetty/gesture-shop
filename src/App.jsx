import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useSpring } from 'framer-motion';
import { ShoppingBag, ChevronUp, ChevronDown, Trash2, RotateCcw, MousePointer2, Hand, Maximize2, X, Minus, Plus } from 'lucide-react';
import { useHandTracking } from './useHandTracking';
import { ProductCard } from './ProductCard';
import { ProductDetails } from './ProductDetails';
import { PRODUCTS } from './data';

export default function App() {
  const [inputMode, setInputMode] = useState('mouse');
  const [cart, setCart] = useState([]);
  
  const [draggedProduct, setDraggedProduct] = useState(null); 
  const [draggedCartItem, setDraggedCartItem] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  // UI States
  const [isCartHovered, setIsCartHovered] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [magneticTarget, setMagneticTarget] = useState(null);
  const [isPotentialDrag, setIsPotentialDrag] = useState(false);
  
  const { videoRef, cursorRef: handCursorRef, isGrabbing: isHandGrabbing } = useHandTracking(inputMode === 'gesture');
  
  const mouseCursorRef = useRef({ x: 0.5, y: 0.5 });
  const [isClicking, setIsClicking] = useState(false);
  const [clickRipple, setClickRipple] = useState(null);

  const cartZoneRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const grabStartTime = useRef(0);
  
  const isGrabbingRef = useRef(false);
  const draggedProductRef = useRef(null); 
  const magneticTargetRef = useRef(null);
  const isCartHoveredRef = useRef(false);
  const isPotentialDragRef = useRef(false);
  const lastClickTimeRef = useRef(0); 

  const isGrabbing = inputMode === 'gesture' ? isHandGrabbing : isClicking;
  
  const isMax1 = (isCartHovered || draggedProduct !== null || isPotentialDrag) && !showCartModal;
  const isMax2 = showCartModal;
  const isMax0 = !isMax1 && !isMax2;

  const cursorX = useSpring(0, { stiffness: 600, damping: 30 });
  const cursorY = useSpring(0, { stiffness: 600, damping: 30 });

  useEffect(() => {
      isGrabbingRef.current = isGrabbing;
      draggedProductRef.current = draggedProduct || draggedCartItem;
      isCartHoveredRef.current = isCartHovered;
      isPotentialDragRef.current = isPotentialDrag;
  }, [isGrabbing, draggedProduct, draggedCartItem, isCartHovered, isPotentialDrag]);

  const addToCart = (product, size = 9) => { 
    setCart(prev => {
      const newCart = [...prev];
      const existingIndex = newCart.findIndex(item => item.id === product.id && item.selectedSize === size);
      if (existingIndex >= 0) {
        // IMMUTABLE UPDATE
        const existingItem = { ...newCart[existingIndex] };
        existingItem.quantity = (existingItem.quantity || 1) + 1;
        newCart[existingIndex] = existingItem;
      } else {
        newCart.push({ ...product, selectedSize: size, quantity: 1 });
      }
      return newCart;
    });
  };

  const updateQuantity = (e, index, delta) => {
    if (e) e.stopPropagation();
    
    // Debounce
    if (Date.now() - lastClickTimeRef.current < 200) return;
    lastClickTimeRef.current = Date.now();

    setCart(prev => {
        const newCart = [...prev];
        // IMMUTABLE UPDATE (Fixes the +2 bug)
        const item = { ...newCart[index] }; 
        
        if (item.quantity + delta <= 0) {
            newCart.splice(index, 1);
        } else {
            item.quantity += delta;
            newCart[index] = item;
        }
        return newCart;
    });
    playSynthSound('click');
  };

  const playSynthSound = (type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    if (type === 'grab') { osc.frequency.setValueAtTime(600, now); osc.frequency.linearRampToValueAtTime(100, now + 0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.1); }
    else if (type === 'click') { osc.frequency.setValueAtTime(1000, now); osc.frequency.linearRampToValueAtTime(600, now + 0.05); gain.gain.setValueAtTime(0.05, now); gain.gain.linearRampToValueAtTime(0, now + 0.05); }
    else if (type === 'drop') { osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now + 0.1); gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0, now + 0.1); }
    
    osc.start(now); osc.stop(now + 0.15);
  };
  
  useEffect(() => {
    const updateMouse = (e) => { mouseCursorRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight }; };
    const down = () => setIsClicking(true);
    const up = () => setIsClicking(false);
    
    if (inputMode === 'mouse') {
      window.addEventListener('mousemove', updateMouse); window.addEventListener('mousedown', down); window.addEventListener('mouseup', up);
    }
    return () => { window.removeEventListener('mousemove', updateMouse); window.removeEventListener('mousedown', down); window.removeEventListener('mouseup', up); };
  }, [inputMode]);

  const handleScroll = (direction) => {
      if (scrollContainerRef.current) {
          const amount = window.innerHeight * 0.4;
          scrollContainerRef.current.scrollBy({ top: direction === 'up' ? -amount : amount, behavior: 'smooth' });
          playSynthSound('click');
      }
  };

  // --- RENDER LOOP ---
  useEffect(() => {
    let animationFrameId;
    const loop = () => {
        const cx = inputMode === 'gesture' ? handCursorRef.current.x : mouseCursorRef.current.x;
        const cy = inputMode === 'gesture' ? handCursorRef.current.y : mouseCursorRef.current.y;
        const screenX = cx * window.innerWidth;
        const screenY = cy * window.innerHeight;
        
        // 1. Cursor Physics
        if (magneticTargetRef.current) {
             const rect = magneticTargetRef.current.getBoundingClientRect();
             cursorX.set(rect.left + rect.width / 2);
             cursorY.set(rect.top + rect.height / 2);
        } else {
             cursorX.set(screenX);
             cursorY.set(screenY);
        }

        // 2. Interaction Logic
        // Check for magnetic targets ALL THE TIME (even if modal is open)
        const el = document.elementFromPoint(screenX, screenY);
        const magnet = el?.closest('.magnetic-button') || el?.closest('button');
        
        if (magnet !== magneticTargetRef.current) {
            magneticTargetRef.current = magnet;
            setMagneticTarget(magnet); 
            if (magnet) playSynthSound('click'); 
        }

        // 3. Background Interactions (Only if Modal/Details CLOSED)
        if (!selectedProduct && !showCartModal) {
            // A. Potential Drag
            const isHoveringProduct = !!el?.closest('[data-product-id]');
            const grabbingProduct = isGrabbingRef.current && isHoveringProduct;
            
            if (grabbingProduct !== isPotentialDragRef.current) {
                setIsPotentialDrag(grabbingProduct); 
            }

            // B. Hover Check
            const cartContainer = el?.closest('.cart-container');
            const shouldBeHovered = !!cartContainer;
            if (shouldBeHovered !== isCartHoveredRef.current) {
                setIsCartHovered(shouldBeHovered); 
            }
        } 

        animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [inputMode, selectedProduct, showCartModal]);

  // --- GESTURE EVENTS ---
  useEffect(() => {
    if (isGrabbing) {
        if (grabStartTime.current === 0) grabStartTime.current = Date.now();

        const checkDragTimer = setTimeout(() => {
             if (isGrabbingRef.current && !draggedProductRef.current && !selectedProduct && !showCartModal) {
                 const cx = inputMode === 'gesture' ? handCursorRef.current.x : mouseCursorRef.current.x;
                 const cy = inputMode === 'gesture' ? handCursorRef.current.y : mouseCursorRef.current.y;
                 const el = document.elementFromPoint(cx * window.innerWidth, cy * window.innerHeight);
                 
                 const prodEl = el?.closest('[data-product-id]');
                 const cartEl = el?.closest('[data-cart-index]');
                 
                 if (prodEl) {
                     const p = PRODUCTS.find(x => x.id === parseInt(prodEl.getAttribute('data-product-id')));
                     if(p) { setDraggedProduct({...p, selectedSize: 9}); playSynthSound('grab'); }
                 } else if (cartEl) {
                     const idx = parseInt(cartEl.getAttribute('data-cart-index'));
                     const item = cart[idx];
                     if (item) {
                         const newCart = [...cart];
                         if(item.quantity > 1) newCart[idx].quantity--; else newCart.splice(idx, 1);
                         setCart(newCart);
                         setDraggedCartItem({...item, quantity: 1});
                         playSynthSound('grab');
                     }
                 }
             }
        }, 200);
        return () => clearTimeout(checkDragTimer);

    } else {
        const duration = Date.now() - grabStartTime.current;
        const wasClick = duration > 0 && duration < 300;
        
        if (wasClick && inputMode === 'gesture') {
            const cx = handCursorRef.current.x;
            const cy = handCursorRef.current.y;
            const el = document.elementFromPoint(cx * window.innerWidth, cy * window.innerHeight);
            
            const btn = el?.closest('button');
            const card = el?.closest('[data-product-id]');

            // CLICK HANDLING
            if (btn) {
                btn.click();
            } else if (card && !showCartModal && !selectedProduct) {
                 const p = PRODUCTS.find(x => x.id === parseInt(card.getAttribute('data-product-id')));
                 if (p) setSelectedProduct(p);
            } else if (selectedProduct && !el.closest('.product-detail-card')) {
                 setSelectedProduct(null); // Close modal if clicked outside
            }

            setClickRipple({ x: cx * window.innerWidth, y: cy * window.innerHeight, id: Date.now() });
        }
        
        if (draggedProduct || draggedCartItem) {
             const cx = inputMode === 'gesture' ? handCursorRef.current.x : mouseCursorRef.current.x;
             const x = cx * window.innerWidth;
             
             if (draggedProduct) {
                if (x > window.innerWidth - 300) { 
                    addToCart(draggedProduct, draggedProduct.selectedSize);
                    playSynthSound('drop');
                }
             }
             if (draggedCartItem) {
                 if (x < window.innerWidth - 350) { 
                      setDraggedCartItem(null); 
                      playSynthSound('drop');
                 } else {
                      addToCart(draggedCartItem, draggedCartItem.selectedSize); 
                 }
             }
             setDraggedProduct(null);
             setDraggedCartItem(null);
        }
        grabStartTime.current = 0;
    }
  }, [isGrabbing, draggedProduct, draggedCartItem, inputMode, selectedProduct, showCartModal, cart]); 

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
  const max0Height = Math.min(80 + (cart.length * 48), 400); 

  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans flex text-gray-800 bg-transparent">
      {/* BACKGROUND */}
      <div className={`fixed inset-0 z-[-1] bg-gray-100 transition-colors duration-500 ${inputMode === 'gesture' ? 'bg-black' : ''}`}>
         <video ref={videoRef} autoPlay playsInline muted style={{ filter: `blur(24px)` }} className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-700 ${inputMode === 'gesture' ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* --- GRID --- */}
      <div ref={scrollContainerRef} className="w-full h-full p-6 pt-24 md:p-10 md:pr-32 overflow-y-auto scroll-smooth no-scrollbar select-none relative">
        <header className="hidden md:flex mb-8 justify-between items-center bg-white/60 backdrop-blur-md p-4 rounded-[32px] shadow-sm border border-white/40 sticky top-0 z-10">
           <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 ml-4">Gesture Shop</h1>
           <div className="flex gap-4">
              <button onClick={() => setInputMode('mouse')} className={`magnetic-button w-12 h-12 flex items-center justify-center rounded-full transition-all ${inputMode === 'mouse' ? 'bg-black text-white scale-110 shadow-lg' : 'bg-white/50 hover:bg-white/80'}`}><MousePointer2 size={20} /></button>
              <button onClick={() => setInputMode('gesture')} className={`magnetic-button w-12 h-12 flex items-center justify-center rounded-full transition-all ${inputMode === 'gesture' ? 'bg-[#00e5ff] text-black scale-110 shadow-lg' : 'bg-white/50 hover:bg-white/80'}`}><Hand size={20} /></button>
           </div>
        </header>

        <AnimatePresence>{draggedCartItem && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                <div className="bg-white/90 rounded-[32px] px-10 py-6 flex items-center gap-4 shadow-2xl scale-110 border border-white/50">
                    <RotateCcw size={32} /> <h2 className="text-2xl font-bold">Drop to Return</h2>
                </div>
            </motion.div>
        )}</AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-40">
            {PRODUCTS.map(product => {
                const isHidden = draggedProduct?.id === product.id; 
                return (
                    <div key={product.id} data-product-id={product.id} onClick={() => { if(inputMode === 'mouse') setSelectedProduct(product); }} className={`transition-all duration-300 ${isHidden ? 'opacity-30' : ''}`}>
                        <ProductCard product={product} />
                    </div>
                )
            })}
        </div>
      </div>

      {/* --- SIDEBAR --- */}
      <div className={`fixed right-6 top-0 bottom-0 h-screen flex flex-col items-center justify-center gap-4 z-50 pointer-events-none ${isMax2 ? 'hidden' : ''}`}>
          <button onClick={() => handleScroll('up')} className="magnetic-button pointer-events-auto shrink-0 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/50 hover:bg-black hover:text-white transition-all transform hover:scale-110"><ChevronUp size={24} /></button>

          <motion.div 
            ref={cartZoneRef}
            layout
            className="cart-container pointer-events-auto relative rounded-[40px] border border-white/40 shadow-xl backdrop-blur-md overflow-hidden flex flex-col items-center"
            animate={{ 
                width: isMax1 ? 340 : 80, 
                height: isMax1 ? '75vh' : max0Height, 
                backgroundColor: isMax1 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)'
            }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          >
              <div className={`flex flex-col w-full ${isMax1 ? 'p-6 h-full' : 'py-6 items-center'}`}>
                  
                  {isMax0 && (
                      <div className="flex flex-col items-center gap-3 w-full">
                        <div className="relative p-2 shrink-0">
                           <ShoppingBag size={28} />
                           {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-black text-white w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold">{cart.reduce((a,b)=>a+(b.quantity||1),0)}</span>}
                        </div>
                        <div className="flex flex-col gap-2 mt-2 w-full items-center">
                            <AnimatePresence mode='popLayout'>
                                {cart.map((item, i) => (
                                    <motion.div key={`${item.id}-${item.selectedSize}`} layout initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="w-10 h-10 rounded-full border border-white bg-white shadow-sm overflow-hidden shrink-0">
                                        <img src={item.image} className="w-full h-full object-cover" />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                      </div>
                  )}

                  {isMax1 && (
                      <>
                        <div className="flex justify-between items-center mb-6 w-full shrink-0">
                            <button onClick={() => setCart([])} className="magnetic-button p-2 text-gray-500 hover:text-red-500"><Trash2 /></button>
                            <h2 className="font-bold text-xl">Bag ({cart.reduce((a,b)=>a+(b.quantity||1),0)})</h2>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setIsCartHovered(false); 
                                    setShowCartModal(true); 
                                }} 
                                className="magnetic-button p-2 hover:bg-black hover:text-white rounded-full transition-colors"
                            >
                                <Maximize2 size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar w-full">
                            <AnimatePresence mode='popLayout'>
                                {cart.map((item, i) => (
                                    <motion.div 
                                        key={`${item.id}-${item.selectedSize}`}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                                        data-cart-index={i} 
                                        className="mb-3 bg-white/60 p-3 rounded-[24px] flex items-center gap-3 w-full shadow-sm cursor-grab active:cursor-grabbing hover:bg-white/80 transition-colors"
                                    >
                                        <img src={item.image} className="w-14 h-14 rounded-xl object-cover pointer-events-none bg-white" />
                                        <div className="flex-1 min-w-0 pointer-events-none">
                                            <h4 className="font-bold truncate text-gray-900">{item.name}</h4>
                                            <p className="text-sm text-gray-500 font-medium">${item.price}</p>
                                        </div>
                                        <div className="font-bold bg-black text-white w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md">{item.quantity}</div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {cart.length === 0 && <div className="text-center text-gray-400 mt-20 font-medium">Drag items here</div>}
                        </div>
                        
                        <div className="border-t border-gray-200/50 pt-4 mt-2 shrink-0 w-full">
                            <div className="flex justify-between font-bold text-lg mb-4 px-2"><span>Total</span><span>${cartTotal}</span></div>
                            <button className="magnetic-button w-full bg-black text-white py-4 rounded-full font-bold text-lg hover:scale-[1.02] shadow-xl transition-all">Checkout</button>
                        </div>
                      </>
                  )}
              </div>
          </motion.div>

          <button onClick={() => handleScroll('down')} className="magnetic-button pointer-events-auto shrink-0 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/50 hover:bg-black hover:text-white transition-all transform hover:scale-110"><ChevronDown size={24} /></button>
      </div>

      {/* --- MAX2: MODAL --- */}
      <AnimatePresence>
      {isMax2 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-6 md:inset-12 z-[60] rounded-[32px] border border-white/40 shadow-2xl backdrop-blur-xl bg-white/95 overflow-hidden flex flex-col p-8 pointer-events-auto"
          >
                <div className="flex justify-between items-center mb-8 w-full shrink-0">
                    <button onClick={() => setShowCartModal(false)} className="magnetic-button p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><X size={24} /></button>
                    <h2 className="font-bold text-3xl">Your Bag ({cart.reduce((a,b)=>a+(b.quantity||1),0)})</h2>
                    <div className="w-12"></div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 content-start">
                    <AnimatePresence mode='popLayout'>
                        {cart.map((item, i) => (
                            <motion.div 
                                key={`${item.id}-${item.selectedSize}`}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                className="bg-gray-50/80 border border-gray-200 rounded-[32px] p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
                            >
                                <img src={item.image} className="w-40 h-40 rounded-2xl object-cover pointer-events-none shadow-inner mb-4" />
                                <h4 className="font-bold text-xl text-gray-900 mb-1">{item.name}</h4>
                                <p className="text-gray-500 font-medium mb-4">${item.price}</p>
                                
                                <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-full px-6 py-3 shadow-sm">
                                    <button onClick={(e) => updateQuantity(e, i, -1)} className="magnetic-button w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"><Minus size={24} /></button>
                                    <span className="font-bold text-xl w-8">{item.quantity}</span>
                                    <button onClick={(e) => updateQuantity(e, i, 1)} className="magnetic-button w-12 h-12 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"><Plus size={24} /></button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {cart.length === 0 && <div className="col-span-full text-center text-gray-400 mt-20 font-medium text-2xl">Your bag is empty</div>}
                </div>
                
                <div className="border-t border-gray-200 pt-6 mt-4 shrink-0 w-full flex justify-between items-center">
                    <div className="flex gap-4 items-baseline"><span className="text-gray-500 font-medium">Total</span><span className="font-extrabold text-4xl">${cartTotal}</span></div>
                    <button className="magnetic-button bg-black text-white py-4 px-12 rounded-full font-bold text-xl hover:scale-105 shadow-xl transition-all flex items-center gap-3">
                        Checkout <ChevronUp className="rotate-90" />
                    </button>
                </div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* PREVIEWS & CURSOR */}
      {draggedProduct && <motion.div style={{ x: cursorX, y: cursorY, position: 'fixed', left: 0, top: 0, translateX: '-50%', translateY: '-50%', rotate: 5, pointerEvents: 'none', zIndex: 9999 }}><ProductCard product={draggedProduct} isDragging={true} /></motion.div>}
      {draggedCartItem && <motion.div style={{ x: cursorX, y: cursorY, position: 'fixed', left: 0, top: 0, translateX: '-50%', translateY: '-50%', rotate: -5, scale: 0.8, pointerEvents: 'none', zIndex: 9999 }}><ProductCard product={draggedCartItem} isDragging={true} /></motion.div>}
      <AnimatePresence>{selectedProduct && (<ProductDetails product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={(p, s) => { playSynthSound('drop'); addToCart(p, s); }} />)}</AnimatePresence>
      <motion.div style={{ x: cursorX, y: cursorY, position: 'fixed', translateX: '-50%', translateY: '-50%', pointerEvents: 'none', zIndex: 100000 }}>
        <div className={`rounded-full flex items-center justify-center transition-all duration-200 ${magneticTarget ? 'w-16 h-16 border-2 border-[#00e5ff] bg-[#00e5ff]/10' : 'w-8 h-8 border-2 border-[#00e5ff]'} ${isGrabbing ? 'bg-[#00e5ff]/40 scale-90' : ''}`} />
      </motion.div>
      {clickRipple && <motion.div key={clickRipple.id} initial={{ width: 0, opacity: 0.8 }} animate={{ width: 100, opacity: 0 }} style={{ left: clickRipple.x, top: clickRipple.y, position: 'fixed', transform: 'translate(-50%, -50%)', border: '2px solid #00e5ff', borderRadius: '50%', pointerEvents: 'none', height: 100 }} />}
    </div>
  );
}