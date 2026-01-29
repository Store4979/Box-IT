import React from 'react';
import { motion } from "framer-motion";
import { Package, Shield, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const sensitivityConfig = {
  basic: {
    label: "Basic",
    description: "Non-sensitive items",
    examples: "Clothing, stuffed toys, blankets, shoes, books",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: "🛡️"
  },
  standard: {
    label: "Standard", 
    description: "Medium sensitive items",
    examples: "Computers, jewelry, electronics, toys",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: "📦"
  },
  fragile: {
    label: "Fragile",
    description: "Sensitive items",
    examples: "China, figurines, crystal, art, sensitive equipment",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: "⚠️"
  },
  custom: {
    label: "Custom",
    description: "Highly sensitive items",
    examples: "Scientific/medical equipment, antiques",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: "🔬"
  }
};

export default function PackagingRequirements({ guideline, weight, sensitivity }) {
  if (!guideline) return null;

  const config = sensitivityConfig[sensitivity];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
    >
      {/* Header */}
      <div className={`px-5 py-4 ${config.color.split(' ')[0]} border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h3 className="font-semibold text-slate-800">
                {config.label} Packaging Requirements
              </h3>
              <p className="text-sm text-slate-600">
                For {weight} lb items • {config.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Box Requirements */}
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <Package className="w-5 h-5 text-slate-600" />
          <div>
            <p className="text-sm font-medium text-slate-700">Box Requirement</p>
            <p className="text-sm text-slate-600">
              {guideline.double_wall ? "Double-wall " : ""}{guideline.box_strength} burst strength box
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
          <Shield className="w-5 h-5 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-slate-700">Minimum Padding</p>
            <p className="text-sm text-slate-600">
              {guideline.min_padding}" between item and edge of box on all sides
            </p>
          </div>
        </div>

        {/* Materials List */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Required Materials:</p>
          <ul className="space-y-2">
            {guideline.materials?.map((material, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-600">{material}</span>
              </li>
            ))}
          </ul>
        </div>

        {guideline.notes && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-xl">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-blue-700">{guideline.notes}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function SensitivitySelector({ sensitivity, setSensitivity }) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-700">Item Sensitivity</label>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(sensitivityConfig).map(([key, config]) => (
          <button
            key={key}
            onClick={() => setSensitivity(key)}
            className={`p-3 rounded-xl border-2 text-left transition-all ${
              sensitivity === key
                ? `${config.color} border-current`
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span>{config.icon}</span>
              <span className="font-medium text-sm">{config.label}</span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-1">{config.examples}</p>
          </button>
        ))}
      </div>
    </div>
  );
}