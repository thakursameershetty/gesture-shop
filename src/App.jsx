import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Hand, MousePointer2, ChevronUp, ChevronDown, Trash2, Eye, RotateCcw, Lock } from 'lucide-react';
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

  const { videoRef, cursor: handCursor, isGrabbing: isHandGrabbing } = useHandTracking(inputMode === 'gesture');
  
  const [mouseCursor, setMouseCursor] = useState({ x: 0.5, y: 0.5 });
  const [isClicking, setIsClicking] = useState(false);
  const [activeZone, setActiveZone] = useState(null);
  const [bgBlur, setBgBlur] = useState(20); 
  const [clickRipple, setClickRipple] = useState(null);
  const [autoScrollState, setAutoScrollState] = useState(null);

  const cartZoneRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const grabStartTime = useRef(0);
  const lastPinchRelease = useRef(0);
  
  const cursorRef = useRef({ x: 0.5, y: 0.5 });
  const isGrabbingRef = useRef(false);
  const draggedProductRef = useRef(null); 
  const autoScrollRef = useRef(null); 

  const activeCursor = inputMode === 'gesture' ? handCursor : mouseCursor;
  const isGrabbing = inputMode === 'gesture' ? isHandGrabbing : isClicking;

  useEffect(() => {
      cursorRef.current = activeCursor;
      isGrabbingRef.current = isGrabbing;
      draggedProductRef.current = draggedProduct || draggedCartItem;
      autoScrollRef.current = autoScrollState;
  }, [activeCursor, isGrabbing, draggedProduct, draggedCartItem, autoScrollState]);

  const addToCart = (product, size = 9) => { 
    setCart(prev => {
      const newCart = [...prev];
      const existingIndex = newCart.findIndex(item => item.id === product.id && item.selectedSize === size);
      if (existingIndex >= 0) {
        const existingItem = newCart[existingIndex];
        newCart[existingIndex] = { ...existingItem, quantity: (existingItem.quantity || 1) + 1 };
      } else {
        newCart.push({ ...product, selectedSize: size, quantity: 1 });
      }
      return newCart;
    });
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

    if (type === 'grab') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.08);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.start(now); osc.stop(now + 0.08);
    } else if (type === 'drop') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'delete') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.3, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'click') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.05);
        gain.gain.setValueAtTime(0.1, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'lock') {
        osc.type = 'square'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now); gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now); osc.stop(now + 0.3);
    }
  };
  
  useEffect(() => {
    const updateMouse = (e) => setMouseCursor({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    const down = () => setIsClicking(true);
    const up = () => setIsClicking(false);
    if (inputMode === 'mouse') {
      window.addEventListener('mousemove', updateMouse);
      window.addEventListener('mousedown', down);
      window.addEventListener('mouseup', up);
    }
    return () => {
      window.removeEventListener('mousemove', updateMouse);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
    };
  }, [inputMode]);

  useEffect(() => {
    let animationFrameId;
    const loop = () => {
        if (scrollContainerRef.current) {
            const y = cursorRef.current.y;
            const grabbing = isGrabbingRef.current;
            const draggingItem = draggedProductRef.current;
            const autoScroll = autoScrollRef.current;

            if (autoScroll) {
                const CRUISE_SPEED = 25; 
                if (autoScroll === 'TOP') scrollContainerRef.current.scrollTop -= CRUISE_SPEED;
                else scrollContainerRef.current.scrollTop += CRUISE_SPEED;
            }
            else if (grabbing && !draggingItem && !selectedProduct) {
                if (y < 0.15) {
                    const intensity = (0.15 - y) / 0.15; 
                    scrollContainerRef.current.scrollTop -= (5 + intensity * 35);
                } else if (y > 0.85) {
                    const intensity = (y - 0.85) / 0.15;
                    scrollContainerRef.current.scrollTop += (5 + intensity * 35);
                }
            }
        }
        animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [selectedProduct]); 


  // --- MAIN INTERACTION LOGIC ---
  useEffect(() => {
    const x = activeCursor.x * window.innerWidth;
    const y = activeCursor.y * window.innerHeight;

    if (activeCursor.y < 0.15) setActiveZone('TOP');
    else if (activeCursor.y > 0.85) setActiveZone('BOTTOM');
    else setActiveZone(null);

    // 1. DOUBLE TAP LOGIC
    if (!isGrabbing && grabStartTime.current > 0) {
        const holdDuration = Date.now() - grabStartTime.current;
        const timeSinceLastRelease = Date.now() - lastPinchRelease.current;

        if (holdDuration < 250) { 
            if (timeSinceLastRelease < 300) { 
                // === DOUBLE TAP ===
                playSynthSound('click');
                
                // --- MODAL HANDLING (The Fix) ---
                if (selectedProduct) {
                    setClickRipple({ x, y, id: Date.now(), type: 'click' });
                    const element = document.elementFromPoint(x, y);
                    
                    if (element) {
                        // Check if we are INSIDE the white card
                        const isInsideCard = element.closest('.product-detail-card');
                        
                        if (!isInsideCard) {
                            // Clicked Background -> CLOSE
                            setSelectedProduct(null);
                        } else {
                            // Clicked Inside -> Handle Buttons
                            const clickable = element.closest('button');
                            if (clickable) clickable.click(); 
                        }
                    }
                } 
                // --- GRID HANDLING ---
                else {
                    if (activeCursor.y < 0.15) {
                        playSynthSound('lock'); setAutoScrollState('TOP'); setClickRipple({ x, y, id: Date.now(), type: 'lock' });
                    } else if (activeCursor.y > 0.85) {
                        playSynthSound('lock'); setAutoScrollState('BOTTOM'); setClickRipple({ x, y, id: Date.now(), type: 'lock' });
                    } else {
                        setClickRipple({ x, y, id: Date.now(), type: 'click' });
                        const element = document.elementFromPoint(x, y);
                        if (element) {
                            const clickable = element.closest('button') || element.closest('[data-product-id]') || element;
                            if (clickable) {
                                if (clickable.hasAttribute('data-product-id')) {
                                     const id = parseInt(clickable.getAttribute('data-product-id'));
                                     const product = PRODUCTS.find(p => p.id === id);
                                     if (product) setSelectedProduct(product);
                                } else {
                                    clickable.click();
                                }
                            }
                        }
                    }
                }
                
                lastPinchRelease.current = 0;
                grabStartTime.current = 0;
                return; 
            }
            lastPinchRelease.current = Date.now();
        }
        grabStartTime.current = 0;
    }

    if (isGrabbing) {
        if (grabStartTime.current === 0) {
            grabStartTime.current = Date.now();
            if (autoScrollState) {
                playSynthSound('click'); setAutoScrollState(null); return; 
            }
        }
    }

    if (selectedProduct) return; 
    if (!scrollContainerRef.current) return;

    // 2. DRAG START
    const isHolding = isGrabbing && (Date.now() - grabStartTime.current > 200);
    
    if (isHolding && !draggedProduct && !draggedCartItem && !autoScrollState && activeCursor.y >= 0.15 && activeCursor.y <= 0.85) {
        const elements = document.elementsFromPoint(x, y);
        
        const gridElement = elements.find(el => el.getAttribute('data-product-id'));
        if (gridElement) {
            const id = parseInt(gridElement.getAttribute('data-product-id'));
            const product = PRODUCTS.find(p => p.id === id);
            if (product) {
                playSynthSound('grab');
                setDraggedProduct({ ...product, selectedSize: 9 });
            }
        }
        
        const cartElement = elements.find(el => el.getAttribute('data-cart-index'));
        if (cartElement) {
            const index = parseInt(cartElement.getAttribute('data-cart-index'));
            const item = cart[index];
            if (item) {
                playSynthSound('grab');
                const newCart = [...cart];
                // When dragging from cart, we don't decrement yet, we just pick it up visually.
                // Decrement logic happens when we set state.
                if (item.quantity > 1) {
                    newCart[index] = { ...item, quantity: item.quantity - 1 };
                } else {
                    newCart.splice(index, 1);
                }
                setCart(newCart);
                setDraggedCartItem({ ...item, quantity: 1 });
            }
        }
    }

    // 3. DROP (To Cart)
    if (!isGrabbing && draggedProduct) {
        if (cartZoneRef.current) {
            const rect = cartZoneRef.current.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                playSynthSound('drop');
                addToCart(draggedProduct, draggedProduct.selectedSize);
            }
        }
        setDraggedProduct(null);
    }

    // 4. RETURN (To Shelf)
    if (!isGrabbing && draggedCartItem) {
        if (scrollContainerRef.current) {
            const rect = scrollContainerRef.current.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                playSynthSound('delete');
                setDraggedCartItem(null); 
                return;
            }
        }
        addToCart(draggedCartItem, draggedCartItem.selectedSize);
        setDraggedCartItem(null);
    }

  }, [isGrabbing, activeCursor, draggedProduct, draggedCartItem, cart, selectedProduct, autoScrollState]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
  const totalItemsCount = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const handleAddToCartFromModal = (product, size) => {
      playSynthSound('drop');
      addToCart(product, size);
  };

  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans flex flex-col md:flex-row text-gray-800 bg-transparent">
      <div className={`fixed inset-0 z-[-1] bg-gray-100 transition-colors duration-500 ${inputMode === 'gesture' ? 'bg-black' : ''}`}>
         <video ref={videoRef} autoPlay playsInline muted style={{ filter: `blur(${bgBlur}px)` }} className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-700 ${inputMode === 'gesture' ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* GRID */}
      <div ref={scrollContainerRef} className="w-full md:w-2/3 h-full p-6 pt-24 md:p-10 overflow-y-auto scroll-smooth no-scrollbar select-none relative">
        <header className="hidden md:flex mb-8 justify-between items-center bg-white/80 backdrop-blur-xl p-4 rounded-[32px] shadow-sm border border-white/20">
          <div><h1 className="text-3xl font-extrabold tracking-tight text-gray-900">New Drops</h1></div>
          <div className="flex items-center gap-4">
             {inputMode === 'gesture' && (<div className="flex items-center gap-2 px-4 border-r border-gray-300"><Eye size={16} className="text-gray-500" /><input type="range" min="0" max="100" value={bgBlur} onChange={(e) => setBgBlur(e.target.value)} className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /><span className="text-xs font-mono w-10 text-right">{bgBlur}px</span></div>)}
             <div className="flex bg-gray-100 rounded-full p-1"><button onClick={() => setInputMode('mouse')} className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold transition-all ${inputMode === 'mouse' ? 'bg-black text-white' : 'text-gray-500'}`}><MousePointer2 size={16} /> Mouse</button><button onClick={() => setInputMode('gesture')} className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold transition-all ${inputMode === 'gesture' ? 'bg-[#00e5ff] text-black' : 'text-gray-500'}`}><Hand size={16} /> Gesture AI</button></div>
          </div>
        </header>

        <div className="md:hidden fixed top-0 left-0 right-0 z-40 p-4">
             <div className="bg-white/90 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg flex justify-between items-center">
                 <h1 className="font-bold text-lg">Gesture Shop</h1>
                 <button onClick={() => setInputMode(m => m === 'mouse' ? 'gesture' : 'mouse')} className="bg-black text-white text-xs px-3 py-1.5 rounded-full font-bold">{inputMode === 'mouse' ? 'Switch to AI' : 'Switch to Touch'}</button>
             </div>
        </div>

        <AnimatePresence>{draggedCartItem && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 md:w-2/3 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none"><div className="bg-white/90 rounded-[32px] px-8 py-4 flex items-center gap-4 shadow-2xl scale-125"><RotateCcw size={32} className="text-black" /><h2 className="text-2xl font-bold">Drop to Return</h2></div></motion.div>)}</AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-48 md:pb-40">
            {PRODUCTS.map(product => {
                const isHidden = draggedProduct?.id === product.id; 
                return (
                    <div key={product.id} data-product-id={product.id} onClick={() => { if(inputMode === 'mouse') setSelectedProduct(product); }} className={`transition-all duration-300 ${isHidden ? 'opacity-30 scale-95 grayscale' : 'opacity-100'}`}>
                        <ProductCard product={product} style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }} />
                    </div>
                )
            })}
        </div>
        
        <div className={`fixed top-0 left-0 w-full md:w-2/3 h-32 bg-gradient-to-b from-black/10 to-transparent pointer-events-none transition-opacity duration-300 flex justify-center pt-8 md:pt-4 ${(activeZone === 'TOP' || autoScrollState === 'TOP') ? 'opacity-100' : 'opacity-0'}`}><div className={`backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm h-10 transition-colors ${autoScrollState === 'TOP' ? 'bg-[#00e5ff] text-black' : 'bg-white/80 animate-bounce'}`}>{autoScrollState === 'TOP' ? <><Lock size={16} /> Locked Scrolling</> : <><ChevronUp /> Double Pinch to Lock</>}</div></div>
        <div className={`fixed bottom-0 left-0 w-full md:w-2/3 h-32 bg-gradient-to-t from-black/10 to-transparent pointer-events-none transition-opacity duration-300 flex justify-center items-end pb-32 md:pb-4 ${(activeZone === 'BOTTOM' || autoScrollState === 'BOTTOM') ? 'opacity-100' : 'opacity-0'}`}><div className={`backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm h-10 transition-colors ${autoScrollState === 'BOTTOM' ? 'bg-[#00e5ff] text-black' : 'bg-white/80 animate-bounce'}`}>{autoScrollState === 'BOTTOM' ? <><Lock size={16} /> Locked Scrolling</> : <><ChevronDown /> Double Pinch to Lock</>}</div></div>
      </div>

      {/* CART */}
      <div ref={cartZoneRef} className={`fixed bottom-0 left-0 right-0 h-auto max-h-[30vh] md:max-h-none md:relative md:w-1/3 md:h-full border-t md:border-t-0 md:border-l border-white/30 p-6 md:p-8 transition-all duration-300 z-30 ${draggedProduct ? 'bg-blue-50/90' : 'bg-white/60'} backdrop-blur-xl shadow-2xl`}>
        <div className="flex items-center justify-between mb-4 md:mb-8"><h2 className="text-xl md:text-2xl font-bold flex items-center gap-3"><ShoppingBag /> Cart</h2><div className="flex gap-4"><button onClick={() => setCart([])} className="text-gray-500 hover:text-red-600 transition-colors"><Trash2 size={20}/></button><span className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{totalItemsCount}</span></div></div>
        <div className="relative w-full h-32 md:h-[500px] overflow-x-auto md:overflow-visible no-scrollbar flex md:block items-center md:mt-10 gap-4">
            <AnimatePresence>{cart.length === 0 && !draggedCartItem && (<div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-400/50 rounded-[24px]"><p>Drag items here</p></div>)}
            {cart.map((item, index) => (
                <motion.div key={`${item.id}-${item.selectedSize}`} data-cart-index={index} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="md:absolute md:top-0 md:left-0 md:right-0 min-w-[80px] md:min-w-0 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform" style={{ zIndex: index, marginTop: window.innerWidth > 768 ? index * 60 : 0 }}>
                        <div className="hidden md:flex bg-white/90 backdrop-blur border border-white/50 rounded-[24px] p-4 shadow-lg items-center gap-4 relative">
                            <img src={item.image} className="w-20 h-20 rounded-xl object-cover pointer-events-none" />
                            <div className="pointer-events-none">
                                <h3 className="font-bold">{item.name}</h3>
                                <div className="flex gap-2 text-sm text-gray-500"><span>${item.price}</span><span>•</span><span>US {item.selectedSize}</span></div>
                            </div>
                            <div className="absolute top-2 right-2 bg-black text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">x{item.quantity}</div>
                        </div>
                        <div className="md:hidden w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative"><img src={item.image} className="w-full h-full object-cover pointer-events-none" /><div className="absolute top-1 right-1 bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">x{item.quantity}</div></div>
                </motion.div>
            ))}</AnimatePresence>
        </div>
        <div className="hidden md:block absolute bottom-8 left-8 right-8"><div className="flex justify-between text-lg font-bold mb-4"><span>Total</span><span>${cartTotal}</span></div><button className="w-full bg-black text-white py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform">Checkout</button></div>
      </div>

      {/* DRAG LAYERS */}
      {draggedProduct && <div style={{ position: 'fixed', left: 0, top: 0, transform: `translate(${activeCursor.x * window.innerWidth}px, ${activeCursor.y * window.innerHeight}px) translate(-50%, -50%) rotate(5deg) scale(${window.innerWidth < 768 ? 0.6 : 1.1})`, pointerEvents: 'none', zIndex: 9999, transition: 'none', filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.3))' }}><ProductCard product={draggedProduct} isDragging={true} style={{ opacity: 0.9 }} /></div>}
      {draggedCartItem && <div style={{ position: 'fixed', left: 0, top: 0, transform: `translate(${activeCursor.x * window.innerWidth}px, ${activeCursor.y * window.innerHeight}px) translate(-50%, -50%) rotate(-5deg) scale(0.9)`, pointerEvents: 'none', zIndex: 9999, transition: 'none', filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.2))' }}><div className="relative"><ProductCard product={draggedCartItem} isDragging={true} style={{ opacity: 0.9 }} /><div className="absolute top-0 right-0 bg-black text-white font-bold w-8 h-8 rounded-full flex items-center justify-center z-[100] border-2 border-white">x1</div></div></div>}

      {/* MODAL */}
      <AnimatePresence>
        {selectedProduct && (
            <ProductDetails product={selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCartFromModal} />
        )}
      </AnimatePresence>

      {/* CURSOR & RIPPLE */}
      {clickRipple && (<motion.div key={clickRipple.id} initial={{ width: 0, height: 0, opacity: 0.8 }} animate={{ width: 120, height: 120, opacity: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} style={{ left: clickRipple.x, top: clickRipple.y, position: 'fixed', transform: 'translate(-50%, -50%)', border: `3px solid ${clickRipple.type === 'lock' ? '#facc15' : '#00e5ff'}`, borderRadius: '50%', pointerEvents: 'none', zIndex: 99999 }} />)}

      <div style={{ position: 'fixed', left: activeCursor.x * window.innerWidth, top: activeCursor.y * window.innerHeight, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 100000 }}>
        <div className={`w-10 h-10 rounded-full border-[3px] flex items-center justify-center shadow-[0_0_20px_currentColor,inset_0_0_10px_currentColor] transition-all duration-100 ${isGrabbing ? 'scale-125 bg-[#00e5ff]/20' : ''} ${autoScrollState ? 'border-yellow-400 text-yellow-400' : 'border-[#00e5ff] text-[#00e5ff]'}`}>
            {autoScrollState === 'TOP' && <Lock size={16} className="animate-pulse" />}
            {autoScrollState === 'BOTTOM' && <Lock size={16} className="animate-pulse" />}
            {!autoScrollState && activeZone === 'TOP' && !selectedProduct && <ChevronUp size={20} className="animate-bounce" />}
            {!autoScrollState && activeZone === 'BOTTOM' && !selectedProduct && <ChevronDown size={20} className="animate-bounce" />}
            {!activeZone && !autoScrollState && !isGrabbing && <div className="w-1.5 h-1.5 rounded-full bg-current shadow-[0_0_5px_currentColor]" />}
        </div>
      </div>

    </div>
  );
}