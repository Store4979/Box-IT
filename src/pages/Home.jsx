import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Camera, Ruler, Settings, Package, Sparkles, RotateCcw, AlertCircle, Info, Scale } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import DimensionInput from "@/components/DimensionInput";
import PhotoUploader from "@/components/PhotoUploader";
import BoxRecommendation, { NoBoxFits } from "@/components/BoxRecommendation";
import PackagingRequirements, { SensitivitySelector } from "@/components/PackagingRequirements";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import defaultBoxes from "@/data/defaultBoxes.json";
import defaultGuidelines from "@/data/defaultGuidelines.json";
import { readJson, writeJson, STORAGE_KEYS } from "@/lib/storage";
import { findBestBoxes } from "@/lib/boxEngine";
import { makeGuideline, computePaddingPerSide } from "@/lib/packagingRules";

export default function Home() {
  const [dimensions, setDimensions] = useState({ length: '', width: '', height: '' });
  const [weight, setWeight] = useState('');
  const [sensitivity, setSensitivity] = useState('standard');
  const [recommendation, setRecommendation] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputMode, setInputMode] = useState('manual');
  const [photoAnalysis, setPhotoAnalysis] = useState(null);
  const [basicExtraPadding, setBasicExtraPadding] = useState(() => {
    const prefs = readJson(STORAGE_KEYS.preferences, { basicExtraPadding: 0 });
    return Number(prefs.basicExtraPadding) || 0;
  });

  const { data: boxes = [] } = useQuery({
    queryKey: ['boxes'],
    queryFn: () => readJson(STORAGE_KEYS.boxes, defaultBoxes),
  });

  const { data: guidelines = [] } = useQuery({
    queryKey: ['guidelines'],
    queryFn: () => readJson(STORAGE_KEYS.guidelines, defaultGuidelines),
  });

  // Find the appropriate guideline based on weight and sensitivity
  const getGuideline = (itemWeight, itemSensitivity) => {
    const w = parseFloat(itemWeight) || 0;
    // Prefer saved guidelines (editable in Settings), otherwise compute defaults.
    const fromStore = guidelines.find(g => g.sensitivity === itemSensitivity && w >= g.weight_min && w <= g.weight_max);
    if (fromStore) return fromStore;
    return makeGuideline({ sensitivity: itemSensitivity, weight: w, basicExtraPadding });
  };

  const currentGuideline = getGuideline(weight, sensitivity);
  const currentPadding = computePaddingPerSide({ sensitivity, weight, basicExtraPadding });

  const handleFindBox = () => {
    const result = findBestBoxes({ boxes, itemDims: dimensions, paddingPerSide: currentPadding, maxAlternates: 2 });
    setRecommendation(result);
  };

  const handleBasicPaddingChange = (value) => {
    const v = Number(value) || 0;
    setBasicExtraPadding(v);
    const prefs = readJson(STORAGE_KEYS.preferences, { basicExtraPadding: 0 });
    writeJson(STORAGE_KEYS.preferences, { ...prefs, basicExtraPadding: v });
  };

  const handlePhotoExtracted = (data) => {
    setPhotoAnalysis(data);
    setDimensions({
      length: data.length || 0,
      width: data.width || 0,
      height: data.height || 0
    });
  };

  const handleReset = () => {
    setDimensions({ length: '', width: '', height: '' });
    setWeight('');
    setSensitivity('standard');
    setRecommendation(null);
    setPhotoAnalysis(null);
  };

  const hasValidDimensions = dimensions.length > 0 && dimensions.width > 0 && dimensions.height > 0;
  const hasValidWeight = parseFloat(weight) > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-800">BoxFit</h1>
              <p className="text-xs text-slate-500">Smart packaging</p>
            </div>
          </div>
          <Link to={createPageUrl('Settings')}>
            <Button variant="ghost" size="icon" className="text-slate-500">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* No boxes warning */}
        {boxes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">No box sizes configured</p>
              <p className="text-sm text-amber-700 mt-1">
                <Link to={createPageUrl('Settings')} className="underline">Add your box sizes</Link> to get started.
              </p>
            </div>
          </motion.div>
        )}

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <Tabs value={inputMode} onValueChange={setInputMode} className="w-full">
            <TabsList className="w-full grid grid-cols-2 bg-slate-50 rounded-none h-14 p-1">
              <TabsTrigger 
                value="manual" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 h-full"
              >
                <Ruler className="w-4 h-4" />
                Manual Entry
              </TabsTrigger>
              <TabsTrigger 
                value="photo" 
                className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2 h-full"
              >
                <Camera className="w-4 h-4" />
                Photo
              </TabsTrigger>
            </TabsList>

            <div className="p-5">
              <TabsContent value="manual" className="mt-0">
                <DimensionInput dimensions={dimensions} setDimensions={setDimensions} />
              </TabsContent>

              <TabsContent value="photo" className="mt-0">
                <PhotoUploader 
                  onDimensionsExtracted={handlePhotoExtracted}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                />
                
                {photoAnalysis && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-slate-50 rounded-xl space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">AI Estimation</span>
                      <Badge variant="outline" className={
                        photoAnalysis.confidence === 'high' ? 'border-emerald-300 text-emerald-700' :
                        photoAnalysis.confidence === 'medium' ? 'border-amber-300 text-amber-700' :
                        'border-red-300 text-red-700'
                      }>
                        {photoAnalysis.confidence} confidence
                      </Badge>
                    </div>
                    {photoAnalysis.item_description && (
                      <p className="text-sm text-slate-600">
                        Detected: {photoAnalysis.item_description}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-lg font-semibold text-slate-800">{photoAnalysis.length}"</p>
                        <p className="text-xs text-slate-500">Length</p>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-lg font-semibold text-slate-800">{photoAnalysis.width}"</p>
                        <p className="text-xs text-slate-500">Width</p>
                      </div>
                      <div className="bg-white rounded-lg p-2">
                        <p className="text-lg font-semibold text-slate-800">{photoAnalysis.height}"</p>
                        <p className="text-xs text-slate-500">Height</p>
                      </div>
                    </div>
                    {photoAnalysis.notes && (
                      <p className="text-xs text-slate-500 italic">{photoAnalysis.notes}</p>
                    )}
                  </motion.div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Weight Input */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-500" />
              <Label className="text-sm font-medium text-slate-700">Item Weight (lbs)</Label>
            </div>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="150"
              placeholder="Enter weight in pounds"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="h-12 text-center text-lg font-medium"
            />
            {parseFloat(weight) > 150 && (
              <p className="text-xs text-amber-600">Items over 150 lbs require special handling</p>
            )}
          </div>
        </div>

        {/* Sensitivity Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <SensitivitySelector sensitivity={sensitivity} setSensitivity={setSensitivity} />

          {sensitivity === 'basic' && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-700">Optional extra padding (per side)</p>
                <p className="text-sm font-semibold text-slate-800">{basicExtraPadding.toFixed(1)}"</p>
              </div>
              <Slider
                value={[basicExtraPadding]}
                min={0}
                max={3}
                step={0.5}
                onValueChange={(vals) => handleBasicPaddingChange(vals?.[0] ?? 0)}
              />
              <p className="text-xs text-slate-500 mt-2">
                Basic packing is employee choice / void fill only. Use this slider if you want extra clearance.
              </p>
            </div>
          )}
          
          {currentGuideline && (
            <p className="text-xs text-slate-500 mt-3">
              {sensitivity === 'basic'
                ? `No fixed minimum padding (void fill only) • ${currentGuideline.box_strength} box`
                : `Requires ${currentPadding}" minimum padding • ${currentGuideline.box_strength} box`}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleFindBox}
            disabled={!hasValidDimensions || !hasValidWeight || boxes.length === 0}
            className="flex-1 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/25 gap-2"
          >
            <Sparkles className="w-5 h-5" />
            Find Best Box
          </Button>
          
          {(hasValidDimensions || hasValidWeight || recommendation) && (
            <Button
              variant="outline"
              size="icon"
              onClick={handleReset}
              className="h-14 w-14"
            >
              <RotateCcw className="w-5 h-5" />
            </Button>
          )}
        </div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {recommendation && (
            <div className="space-y-4">
              {recommendation.noFit ? (
                <NoBoxFits 
                  key="no-fit"
                  itemDimensions={dimensions} 
                  padding={currentPadding} 
                />
              ) : (
                <BoxRecommendation 
                  key="recommendation"
                  recommendation={recommendation}
                  itemDimensions={dimensions}
                  padding={currentPadding}
                />
              )}
              
              {/* Packaging Requirements */}
              {currentGuideline && (
                <PackagingRequirements 
                  guideline={currentGuideline}
                  weight={weight}
                  sensitivity={sensitivity}
                />
              )}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}