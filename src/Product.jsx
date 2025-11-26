import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

export const ProductCard = forwardRef(({ product, isDragging, style }, ref) => {
  return (
    <motion.div 
      ref={ref}
      // 1. DISABLE LAYOUT ID WHEN DRAGGING (Fixes the "floaty" drift)
      layoutId={isDragging ? undefined : `product-${product.id}`}
      style={style}
      className={`
        bg-white rounded-[32px] p-4 w-full max-w-[300px] shadow-2xl relative select-none 
        ${isDragging ? 'cursor-grabbing shadow-2xl z-50' : ''}
      `}
      // 2. INSTANT TRANSITION (Fixes the lag)
      transition={isDragging ? { duration: 0 } : { duration: 0.3 }}
    >
        {/* Image Container */}
        <div className="relative w-full h-[240px] rounded-[24px] overflow-hidden group">
            <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-cover pointer-events-none" 
            />
            {/* Tag */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md text-white text-xs font-medium px-3 py-1.5 rounded-full">
                {product.tag}
            </div>
        </div>

        {/* Details */}
        <div className="pt-4 pb-2 px-1">
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{product.name}</h2>
            <p className="text-gray-400 font-medium text-sm mt-1">Own the Court</p>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mt-4 mb-1">
            <div className="bg-gray-100 text-gray-900 font-bold text-md px-4 py-1.5 rounded-full">
                ${product.price}
            </div>
            <div className="bg-black text-white px-5 py-2 rounded-full flex items-center gap-2">
                <span className="font-medium text-sm">Drag to Cart</span>
            </div>
        </div>
    </motion.div>
  );
});