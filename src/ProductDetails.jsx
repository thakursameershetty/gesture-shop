import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingBag } from 'lucide-react';

export const ProductDetails = ({ product, onClose, onAddToCart }) => {
  const [selectedSize, setSelectedSize] = useState(null);

  if (!product) return null;

  const handleAddToCart = () => {
    if (!selectedSize) {
        onAddToCart(product, 9); 
    } else {
        onAddToCart(product, selectedSize);
    }
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md cursor-auto"
      onClick={onClose} // Mouse Click Backdrop Close
    >
      <motion.div 
        layoutId={`product-${product.id}`} 
        // --- IMPORTANT: Added 'product-detail-card' class below ---
        className="product-detail-card bg-white w-full max-w-4xl h-[80vh] md:h-[600px] rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 bg-white/50 backdrop-blur hover:bg-red-500 hover:text-white p-2 rounded-full transition-colors shadow-sm"
        >
            <X size={24} />
        </button>

        {/* Left: Image */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full relative bg-gray-100">
            <motion.img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover"
            />
            <div className="absolute top-6 left-6 bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full">
                {product.tag}
            </div>
        </div>

        {/* Right: Info */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-between bg-white overflow-y-auto">
            <div>
                <motion.h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2 leading-tight">
                    {product.name}
                </motion.h2>
                <p className="text-2xl font-medium text-gray-500 mb-6">${product.price}</p>
                <div className="h-1 w-20 bg-gray-200 rounded-full mb-6" />
                <p className="text-gray-600 text-lg leading-relaxed">
                    {product.description || "Experience ultimate comfort and style with this premium sneaker."}
                </p>

                <div className="mt-8">
                    <h3 className="font-bold text-sm uppercase text-gray-400 mb-3">Select Size</h3>
                    <div className="flex gap-3 flex-wrap">
                        {[7, 8, 9, 10, 11, 12].map(size => (
                            <button 
                                key={size} 
                                onClick={() => setSelectedSize(size)}
                                className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${selectedSize === size ? 'bg-black text-white border-black scale-110 shadow-lg' : 'border-gray-200 text-gray-600 hover:border-black'}`}
                            >
                                {size}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <button 
                    onClick={handleAddToCart}
                    className={`w-full py-4 rounded-full font-bold text-lg flex items-center justify-center gap-3 transition-all ${selectedSize ? 'bg-[#00e5ff] text-black hover:scale-[1.02] shadow-[#00e5ff]/30 shadow-lg' : 'bg-black text-white hover:scale-[1.02]'}`}
                >
                    <ShoppingBag size={20} />
                    {selectedSize ? `Add Size ${selectedSize} - $${product.price}` : 'Select a Size'}
                </button>
            </div>
        </div>
      </motion.div>
    </motion.div>
  );
};