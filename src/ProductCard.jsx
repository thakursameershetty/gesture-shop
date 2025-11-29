import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

export const ProductCard = forwardRef(({ product, isDragging, style }, ref) => {
  return (
    <motion.div 
      ref={ref}
      layoutId={isDragging ? undefined : `product-${product.id}`}
      style={style}
      className={`
        relative overflow-hidden rounded-[32px] p-4 w-full border border-white/50 select-none
        backdrop-blur-sm bg-white/80 shadow-sm
        ${isDragging ? 'cursor-grabbing z-50 ring-2 ring-[#00e5ff] scale-105 shadow-2xl' : 'hover:bg-white/90 hover:shadow-lg hover:border-white/60 transition-all duration-300'}
      `}
      transition={isDragging ? { duration: 0 } : { duration: 0.3 }}
    >
        <div className="relative w-full h-[240px] rounded-[24px] overflow-hidden group">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover pointer-events-none transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute top-4 left-4 bg-black/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                {product.tag}
            </div>
        </div>
        <div className="pt-5 pb-2 px-2 relative z-10 pointer-events-none">
            <h2 className="text-xl font-extrabold text-gray-900 leading-tight">{product.name}</h2>
            <p className="text-gray-500 font-medium text-sm mt-1">Own the Court</p>
        </div>
        <div className="flex items-center justify-between mt-4 mb-1 relative z-10">
            <div className="bg-white/50 backdrop-blur-sm border border-white/40 text-gray-900 font-bold text-md px-4 py-2 rounded-full">
                ${product.price}
            </div>
            {/* 'magnetic-button' class makes the cursor snap to this */}
            <div className="magnetic-button bg-black text-white px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg group-hover:bg-[#00e5ff] group-hover:text-black transition-colors pointer-events-auto">
                <span className="font-bold text-sm">Add +</span>
            </div>
        </div>
    </motion.div>
  );
});