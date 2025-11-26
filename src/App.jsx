import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Hand, MousePointer2, ChevronUp, ChevronDown, Trash2, Eye, RotateCcw } from 'lucide-react';
import { useHandTracking } from './useHandTracking';
import { ProductCard } from './ProductCard';
import { PRODUCTS } from './data';

export default function App() {
  const [inputMode, setInputMode] = useState('mouse');
  const [cart, setCart] = useState([]);
  
  const [draggedProduct, setDraggedProduct] = useState(null); 
  const [draggedCartItem, setDraggedCartItem] = useState(null);

  // Pass true only if mode is 'gesture'
const { videoRef, cursor: handCursor, isGrabbing: isHandGrabbing, isModelLoaded } = useHandTracking(inputMode === 'gesture');
  const [mouseCursor, setMouseCursor] = useState({ x: 0.5, y: 0.5 });
  const [isClicking, setIsClicking] = useState(false);
  const [activeZone, setActiveZone] = useState(null);
  const [bgBlur, setBgBlur] = useState(20); 

  const cartZoneRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // --- SOUND ENGINE ---
  const playSynthSound = (type) => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'grab') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    } else if (type === 'drop') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'delete') {
        // "Whoosh" sound for returning to shelf
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime); // Slightly louder to confirm action
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
    }
  };
  
  // --- INPUT LISTENERS ---
  useEffect(() => {
    const handleMouseMove = (e) => setMouseCursor({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    const handleTouchMove = (e) => {
        if (isClicking) e.preventDefault(); 
        const touch = e.touches[0];
        setMouseCursor({ x: touch.clientX / window.innerWidth, y: touch.clientY / window.innerHeight });
    };
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        setMouseCursor({ x: touch.clientX / window.innerWidth, y: touch.clientY / window.innerHeight });
        setIsClicking(true);
    };
    const handleTouchEnd = () => setIsClicking(false);

    if (inputMode === 'mouse') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchstart', handleTouchStart, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [inputMode, isClicking]);

  const activeCursor = inputMode === 'gesture' ? handCursor : mouseCursor;
  const isGrabbing = inputMode === 'gesture' ? isHandGrabbing : isClicking;

  // --- LOGIC LOOP ---
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const x = activeCursor.x * window.innerWidth;
    const y = activeCursor.y * window.innerHeight;

    // 1. ZONES
    if (activeCursor.y < 0.15) setActiveZone('TOP');
    else if (activeCursor.y > 0.85) setActiveZone('BOTTOM');
    else setActiveZone(null);

    // 2. SCROLL
    if (isGrabbing && !draggedProduct && !draggedCartItem) {
        const SCROLL_SPEED = 45; 
        if (activeCursor.y < 0.15) scrollContainerRef.current.scrollTop -= SCROLL_SPEED;
        else if (activeCursor.y > 0.85) scrollContainerRef.current.scrollTop += SCROLL_SPEED;
    }

    // 3. GRAB LOGIC
    if (isGrabbing && !draggedProduct && !draggedCartItem && activeCursor.y >= 0.15 && activeCursor.y <= 0.85) {
        const elements = document.elementsFromPoint(x, y);
        
        // A. Grid Grab
        const gridElement = elements.find(el => el.getAttribute('data-product-id'));
        if (gridElement) {
            const id = parseInt(gridElement.getAttribute('data-product-id'));
            const product = PRODUCTS.find(p => p.id === id);
            if (product) {
                playSynthSound('grab');
                setDraggedProduct(product);
            }
        }
        
        // B. Cart Grab (PEEL OFF LOGIC)
        const cartElement = elements.find(el => el.getAttribute('data-cart-index'));
        if (cartElement) {
            const index = parseInt(cartElement.getAttribute('data-cart-index'));
            const item = cart[index];
            if (item) {
                playSynthSound('grab');
                
                // If Quantity > 1, decrement. If Quantity == 1, remove.
                const newCart = [...cart];
                if (item.quantity > 1) {
                    newCart[index] = { ...item, quantity: item.quantity - 1 };
                } else {
                    newCart.splice(index, 1);
                }
                setCart(newCart);

                // We only drag ONE unit
                setDraggedCartItem({ ...item, quantity: 1 });
            }
        }
    }

    // 4. DROP LOGIC (Adding / Merging)
    const addToCart = (productToAdd) => {
         setCart(prev => {
            const existingItemIndex = prev.findIndex(item => item.id === productToAdd.id);
            if (existingItemIndex >= 0) {
                const newCart = [...prev];
                newCart[existingItemIndex] = {
                    ...newCart[existingItemIndex],
                    quantity: (newCart[existingItemIndex].quantity || 1) + 1
                };
                return newCart;
            } else {
                return [...prev, { ...productToAdd, quantity: 1 }];
            }
        });
    };

    if (!isGrabbing && draggedProduct) {
        if (cartZoneRef.current) {
            const rect = cartZoneRef.current.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                playSynthSound('drop');
                addToCart(draggedProduct);
            }
        }
        setDraggedProduct(null);
    }

    // 5. RETURN LOGIC (Cart Item -> Shelf OR Back to Cart)
    if (!isGrabbing && draggedCartItem) {
        // If dropped on SHELF (Left Side)
        if (scrollContainerRef.current) {
            const rect = scrollContainerRef.current.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                // DELETE (RETURN TO SHELF)
                playSynthSound('delete');
                setDraggedCartItem(null); 
                return;
            }
        }
        
        // If dropped back in CART (Oops, I didn't mean to delete)
        // We re-add it using the same merge logic
        addToCart(draggedCartItem);
        setDraggedCartItem(null);
    }

  }, [isGrabbing, activeCursor, draggedProduct, draggedCartItem, cart]);

  // CALCULATIONS
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * (item.quantity || 1)), 0);
  // Total number of actual items (Sum of quantities)
  const totalItemsCount = cart.reduce((acc, item) => acc + (item.quantity || 1), 0);

  return (
    <div className="w-screen h-screen overflow-hidden relative font-sans flex flex-col md:flex-row text-gray-800 bg-transparent">
      
      {/* AR BACKGROUND */}
      <div className={`fixed inset-0 z-[-1] bg-gray-100 transition-colors duration-500 ${inputMode === 'gesture' ? 'bg-black' : ''}`}>
         <video ref={videoRef} autoPlay playsInline muted style={{ filter: `blur(${bgBlur}px)` }} className={`w-full h-full object-cover transform -scale-x-100 transition-opacity duration-700 ${inputMode === 'gesture' ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* PRODUCT GRID */}
      <div ref={scrollContainerRef} className="w-full md:w-2/3 h-full p-6 pt-24 md:p-10 overflow-y-auto scroll-smooth no-scrollbar select-none relative">
        <header className="hidden md:flex mb-8 justify-between items-center bg-white/80 backdrop-blur-xl p-4 rounded-[32px] shadow-sm border border-white/20">
          <div><h1 className="text-3xl font-extrabold tracking-tight text-gray-900">New Drops</h1></div>
          <div className="flex items-center gap-4">
             {inputMode === 'gesture' && (<div className="flex items-center gap-2 px-4 border-r border-gray-300"><Eye size={16} className="text-gray-500" /><input type="range" min="0" max="100" value={bgBlur} onChange={(e) => setBgBlur(e.target.value)} className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" /><span className="text-xs font-mono w-10 text-right">{bgBlur}px</span></div>)}
             <div className="flex bg-gray-100 rounded-full p-1"><button onClick={() => setInputMode('mouse')} className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold transition-all ${inputMode === 'mouse' ? 'bg-black text-white' : 'text-gray-500'}`}><MousePointer2 size={16} /> Mouse</button><button onClick={() => setInputMode('gesture')} className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-semibold transition-all ${inputMode === 'gesture' ? 'bg-[#00e5ff] text-black' : 'text-gray-500'}`}><Hand size={16} /> Gesture AI</button></div>
          </div>
        </header>

        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 p-4">
             <div className="bg-white/90 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg flex justify-between items-center">
                 <h1 className="font-bold text-lg">Gesture Shop</h1>
                 <button onClick={() => setInputMode(m => m === 'mouse' ? 'gesture' : 'mouse')} className="bg-black text-white text-xs px-3 py-1.5 rounded-full font-bold">
                    {inputMode === 'mouse' ? 'Switch to AI' : 'Switch to Touch'}
                 </button>
             </div>
        </div>

        {/* RETURN OVERLAY */}
        <AnimatePresence>
            {draggedCartItem && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 md:w-2/3 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 rounded-[32px] px-8 py-4 flex items-center gap-4 shadow-2xl scale-125"><RotateCcw size={32} className="text-black" /><h2 className="text-2xl font-bold">Drop to Return 1 Item</h2></div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-48 md:pb-40">
            {PRODUCTS.map(product => {
                const isHidden = draggedProduct?.id === product.id; 
                return (
                    <div key={product.id} data-product-id={product.id} className={`transition-all duration-300 ${isHidden ? 'opacity-30 scale-95 grayscale' : 'opacity-100'}`}>
                        <ProductCard product={product} style={{ backgroundColor: 'rgba(255, 255, 255, 0.9)' }} />
                    </div>
                )
            })}
        </div>
        
        <div className={`fixed top-0 left-0 w-full md:w-2/3 h-32 bg-gradient-to-b from-black/10 to-transparent pointer-events-none transition-opacity duration-300 flex justify-center pt-8 md:pt-4 ${activeZone === 'TOP' ? 'opacity-100' : 'opacity-0'}`}><div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm h-10 animate-bounce"><ChevronUp /> Scroll Up</div></div>
        <div className={`fixed bottom-0 left-0 w-full md:w-2/3 h-32 bg-gradient-to-t from-black/10 to-transparent pointer-events-none transition-opacity duration-300 flex justify-center items-end pb-32 md:pb-4 ${activeZone === 'BOTTOM' ? 'opacity-100' : 'opacity-0'}`}><div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-sm h-10 animate-bounce"><ChevronDown /> Scroll Down</div></div>
      </div>

      {/* CART ZONE */}
      <div ref={cartZoneRef} className={`fixed bottom-0 left-0 right-0 h-auto max-h-[30vh] md:max-h-none md:relative md:w-1/3 md:h-full border-t md:border-t-0 md:border-l border-white/30 p-6 md:p-8 transition-all duration-300 z-30 ${draggedProduct ? 'bg-blue-50/90' : 'bg-white/60'} backdrop-blur-xl shadow-2xl`}>
        <div className="flex items-center justify-between mb-4 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3"><ShoppingBag /> Cart</h2>
            <div className="flex gap-4">
                <button onClick={() => setCart([])} className="text-gray-500 hover:text-red-600 transition-colors"><Trash2 size={20}/></button>
                {/* TOTAL ITEMS BADGE */}
                <span className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{totalItemsCount}</span>
            </div>
        </div>
        
        <div className="relative w-full h-32 md:h-[500px] overflow-x-auto md:overflow-visible no-scrollbar flex md:block items-center md:mt-10 gap-4">
            <AnimatePresence>
                {cart.length === 0 && !draggedCartItem && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-400/50 rounded-[24px]">
                        <p>Drag items here</p>
                    </div>
                )}
                {cart.map((item, index) => (
                    <motion.div key={item.id} data-cart-index={index} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="md:absolute md:top-0 md:left-0 md:right-0 min-w-[80px] md:min-w-0 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform" style={{ zIndex: index, marginTop: window.innerWidth > 768 ? index * 60 : 0 }}>
                         <div className="hidden md:flex bg-white/90 backdrop-blur border border-white/50 rounded-[24px] p-4 shadow-lg items-center gap-4 relative">
                            <img src={item.image} className="w-20 h-20 rounded-xl object-cover pointer-events-none" />
                            <div className="pointer-events-none"><h3 className="font-bold">{item.name}</h3><p className="text-gray-500">${item.price}</p></div>
                            <div className="absolute top-2 right-2 bg-black text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-md">x{item.quantity}</div>
                         </div>
                         <div className="md:hidden w-20 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
                            <img src={item.image} className="w-full h-full object-cover pointer-events-none" />
                            <div className="absolute top-1 right-1 bg-black text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">x{item.quantity}</div>
                         </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
        <div className="hidden md:block absolute bottom-8 left-8 right-8">
            <div className="flex justify-between text-lg font-bold mb-4"><span>Total</span><span>${cartTotal}</span></div>
            <button className="w-full bg-black text-white py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform">Checkout</button>
        </div>
      </div>

      {/* DRAG LAYERS */}
      {draggedProduct && (
        <div style={{ position: 'fixed', left: 0, top: 0, transform: `translate(${activeCursor.x * window.innerWidth}px, ${activeCursor.y * window.innerHeight}px) translate(-50%, -50%) rotate(5deg) scale(${window.innerWidth < 768 ? 0.6 : 1.1})`, pointerEvents: 'none', zIndex: 9999, transition: 'none', filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.3))' }}>
            <ProductCard product={draggedProduct} isDragging={true} style={{ opacity: 0.9 }} />
        </div>
      )}
      {draggedCartItem && (
        <div style={{ position: 'fixed', left: 0, top: 0, transform: `translate(${activeCursor.x * window.innerWidth}px, ${activeCursor.y * window.innerHeight}px) translate(-50%, -50%) rotate(-5deg) scale(0.9)`, pointerEvents: 'none', zIndex: 9999, transition: 'none', filter: 'drop-shadow(0px 20px 30px rgba(0,0,0,0.2))' }}>
             <div className="relative">
                <ProductCard product={draggedCartItem} isDragging={true} style={{ opacity: 0.9 }} />
                {/* Always show x1 when dragging a single item out to return it */}
                <div className="absolute top-0 right-0 bg-black text-white font-bold w-8 h-8 rounded-full flex items-center justify-center z-[100] border-2 border-white">x1</div>
             </div>
        </div>
      )}

      {/* CURSOR */}
      <div style={{ position: 'fixed', left: activeCursor.x * window.innerWidth, top: activeCursor.y * window.innerHeight, transform: 'translate(-50%, -50%)', pointerEvents: 'none', zIndex: 10000 }}>
        <div className={`w-8 h-8 rounded-full border-4 transition-all duration-100 flex items-center justify-center ${isGrabbing ? 'scale-125 border-[#00e5ff] bg-black/10' : 'border-black/30 bg-transparent'}`}>
            {activeZone === 'TOP' && <ChevronUp size={16} className="text-black animate-bounce" />}
            {activeZone === 'BOTTOM' && <ChevronDown size={16} className="text-black animate-bounce" />}
            {!activeZone && !isGrabbing && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
        </div>
      </div>
    </div>
  );
}