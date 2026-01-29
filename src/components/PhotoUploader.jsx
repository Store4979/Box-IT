import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Photo mode (Base44 removed)
 *
 * For now, photo is used as a visual reference while the employee enters dimensions.
 * This avoids inaccurate auto-measurements and works offline.
 *
 * (We can add true measurement later using a reference object + CV.)
 */
export default function PhotoUploader({ onDimensionsExtracted }) {
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [dims, setDims] = useState({ length: '', width: '', height: '' });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const clear = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setDims({ length: '', width: '', height: '' });
  };

  const applyDims = () => {
    const length = parseFloat(dims.length) || 0;
    const width = parseFloat(dims.width) || 0;
    const height = parseFloat(dims.height) || 0;
    onDimensionsExtracted?.({ length, width, height, source: 'photo_manual' });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-slate-900">
            <ImageIcon className="h-4 w-4" />
            Photo Reference
          </div>
          {preview && (
            <Button variant="ghost" size="icon" onClick={clear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {!preview ? (
          <div className="mt-3 flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload Photo
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
              <Camera className="h-4 w-4" /> Take Photo
            </Button>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl overflow-hidden border">
              <img src={preview} alt="Item preview" className="w-full h-auto" />
            </div>

            <div className="text-sm text-slate-600">
              Use the photo as a reference, then enter the item&apos;s dimensions below.
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Length (in)</Label>
                <Input value={dims.length} onChange={(e) => setDims(s => ({ ...s, length: e.target.value }))} />
              </div>
              <div>
                <Label>Width (in)</Label>
                <Input value={dims.width} onChange={(e) => setDims(s => ({ ...s, width: e.target.value }))} />
              </div>
              <div>
                <Label>Height (in)</Label>
                <Input value={dims.height} onChange={(e) => setDims(s => ({ ...s, height: e.target.value }))} />
              </div>
            </div>

            <Button onClick={applyDims} disabled={!(parseFloat(dims.length) > 0 && parseFloat(dims.width) > 0 && parseFloat(dims.height) > 0)}>
              Use These Dimensions
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
