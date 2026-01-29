import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ruler } from "lucide-react";

export default function DimensionInput({ dimensions, setDimensions }) {
  const handleChange = (field, value) => {
    const numValue = value === '' ? '' : parseFloat(value) || 0;
    setDimensions(prev => ({ ...prev, [field]: numValue }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-600">
        <Ruler className="w-5 h-5" />
        <span className="text-sm font-medium">Enter Item Dimensions (inches)</span>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="length" className="text-xs text-slate-500 uppercase tracking-wide">
            Length
          </Label>
          <Input
            id="length"
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={dimensions.length}
            onChange={(e) => handleChange('length', e.target.value)}
            className="text-center text-lg font-medium h-14 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="width" className="text-xs text-slate-500 uppercase tracking-wide">
            Width
          </Label>
          <Input
            id="width"
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={dimensions.width}
            onChange={(e) => handleChange('width', e.target.value)}
            className="text-center text-lg font-medium h-14 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="height" className="text-xs text-slate-500 uppercase tracking-wide">
            Height
          </Label>
          <Input
            id="height"
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={dimensions.height}
            onChange={(e) => handleChange('height', e.target.value)}
            className="text-center text-lg font-medium h-14 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20"
          />
        </div>
      </div>
      
      {dimensions.length > 0 && dimensions.width > 0 && dimensions.height > 0 && (
        <div className="text-center text-sm text-slate-500">
          Volume: <span className="font-semibold text-slate-700">
            {(dimensions.length * dimensions.width * dimensions.height).toFixed(1)} in³
          </span>
        </div>
      )}
    </div>
  );
}