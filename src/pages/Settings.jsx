import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Trash2, Edit2, CloudDownload, CloudUpload, Lock } from 'lucide-react';
import defaultBoxes from '@/data/defaultBoxes.json';
import defaultGuidelines from '@/data/defaultGuidelines.json';
import { readJson, writeJson, STORAGE_KEYS } from '@/lib/storage';
import { configApi } from '@/lib/configSync';
import { toast } from '@/components/ui/use-toast';

const emptyBox = { name: '', length: '', width: '', height: '', cost: '', is_active: true };
const emptyGuideline = {
  name: '',
  sensitivity: 'standard',
  weight_min: 1,
  weight_max: 10,
  min_padding: 0,
  box_strength: '',
  double_wall: false,
  materials: [],
  notes: '',
  is_active: true,
};

export default function Settings() {
  const queryClient = useQueryClient();

  const [isUnlocked, setIsUnlocked] = useState(() => sessionStorage.getItem('boxfit.adminUnlocked') === '1');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [boxDialog, setBoxDialog] = useState({ open: false, box: null });
  const [guidelineDialog, setGuidelineDialog] = useState({ open: false, guideline: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null, type: null });

  const saveTimer = useRef(null);

  const { data: boxes = [] } = useQuery({
    queryKey: ['boxes'],
    queryFn: () => readJson(STORAGE_KEYS.boxes, defaultBoxes),
  });

  const { data: guidelines = [] } = useQuery({
    queryKey: ['guidelines'],
    queryFn: () => readJson(STORAGE_KEYS.guidelines, defaultGuidelines),
  });

  const lastUpdatedAt = readJson('boxfit.config.updatedAt', null);
  const version = readJson('boxfit.config.version', 0);

  const persistBoxes = (next) => {
    writeJson(STORAGE_KEYS.boxes, next);
    queryClient.invalidateQueries({ queryKey: ['boxes'] });
    queueCloudSave({ boxes: next, guidelines });
  };

  const persistGuidelines = (next) => {
    writeJson(STORAGE_KEYS.guidelines, next);
    queryClient.invalidateQueries({ queryKey: ['guidelines'] });
    queueCloudSave({ boxes, guidelines: next });
  };

  const queueCloudSave = (partial) => {
    if (!isUnlocked) return; // employees can view, only unlocked admins can save changes
    if (!pin) return;

    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const local = configApi.getLocalConfig();
        const config = {
          boxes: partial.boxes ?? local.boxes,
          guidelines: partial.guidelines ?? local.guidelines,
          preferences: local.preferences,
        };
        const saved = await configApi.saveRemoteConfig({ pin, config });
        configApi.setLocalConfig(saved);
        toast({ title: 'Saved', description: `Shared settings synced (v${saved.version}).` });
      } catch (e) {
        toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
      }
    }, 600);
  };

  const unlock = async () => {
    setPinError('');
    if (!pin) {
      setPinError('Enter the admin PIN.');
      return;
    }
    // Validate PIN by attempting a no-op save of current config.
    try {
      const local = configApi.getLocalConfig();
      await configApi.saveRemoteConfig({
        pin,
        config: { boxes: local.boxes, guidelines: local.guidelines, preferences: local.preferences }
      });
      sessionStorage.setItem('boxfit.adminUnlocked', '1');
      setIsUnlocked(true);
      toast({ title: 'Admin unlocked', description: 'You can now edit and sync settings.' });
    } catch (e) {
      setPinError('Invalid PIN.');
    }
  };

  const syncFromCloud = async () => {
    try {
      const remote = await configApi.fetchRemoteConfig();
      if (!remote) {
        toast({ title: 'No cloud config yet', description: 'Nothing saved to the cloud. Unlock and save once to seed it.' });
        return;
      }
      configApi.setLocalConfig(remote);
      queryClient.invalidateQueries({ queryKey: ['boxes'] });
      queryClient.invalidateQueries({ queryKey: ['guidelines'] });
      toast({ title: 'Synced', description: `Loaded shared settings (v${remote.version}).` });
    } catch (e) {
      toast({ title: 'Sync failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const pushToCloudNow = async () => {
    if (!isUnlocked || !pin) {
      toast({ title: 'Locked', description: 'Enter the admin PIN to save shared settings.', variant: 'destructive' });
      return;
    }
    try {
      const local = configApi.getLocalConfig();
      const saved = await configApi.saveRemoteConfig({
        pin,
        config: { boxes: local.boxes, guidelines: local.guidelines, preferences: local.preferences }
      });
      configApi.setLocalConfig(saved);
      toast({ title: 'Saved', description: `Shared settings synced (v${saved.version}).` });
    } catch (e) {
      toast({ title: 'Save failed', description: String(e?.message || e), variant: 'destructive' });
    }
  };

  const handleSaveBox = () => {
    const data = {
      ...boxDialog.box,
      length: parseFloat(boxDialog.box.length),
      width: parseFloat(boxDialog.box.width),
      height: parseFloat(boxDialog.box.height),
      cost: boxDialog.box.cost ? parseFloat(boxDialog.box.cost) : null,
    };
    const next = [...boxes];
    if (data.id) {
      const idx = next.findIndex(b => b.id === data.id);
      if (idx >= 0) next[idx] = data;
    } else {
      data.id = `box_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      next.push(data);
    }
    persistBoxes(next);
    setBoxDialog({ open: false, box: null });
  };

  const handleSaveGuideline = () => {
    const raw = guidelineDialog.guideline;
    const data = {
      ...raw,
      weight_min: Number(raw.weight_min),
      weight_max: Number(raw.weight_max),
      min_padding: Number(raw.min_padding),
      materials: Array.isArray(raw.materials)
        ? raw.materials
        : String(raw.materials || '')
            .split('\n')
            .map(s => s.trim())
            .filter(Boolean),
    };

    const next = [...guidelines];
    if (data.id) {
      const idx = next.findIndex(g => g.id === data.id);
      if (idx >= 0) next[idx] = data;
    } else {
      data.id = `guide_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      next.push(data);
    }
    persistGuidelines(next);
    setGuidelineDialog({ open: false, guideline: null });
  };

  const handleDelete = () => {
    if (!deleteDialog.item || !deleteDialog.type) return;
    if (deleteDialog.type === 'box') {
      persistBoxes(boxes.filter(b => b.id !== deleteDialog.item.id));
    } else {
      persistGuidelines(guidelines.filter(g => g.id !== deleteDialog.item.id));
    }
    setDeleteDialog({ open: false, item: null, type: null });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
              <div className="font-semibold text-slate-900">Settings</div>
              <div className="text-xs text-slate-500">
                Store {configApi.storeId} • {lastUpdatedAt ? `Last sync: ${new Date(lastUpdatedAt).toLocaleString()}` : 'Not synced yet'} • v{version || 0}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={syncFromCloud} className="gap-2">
              <CloudDownload className="h-4 w-4" /> Sync
            </Button>
            <Button onClick={pushToCloudNow} className="gap-2">
              <CloudUpload className="h-4 w-4" /> Save
            </Button>
          </div>
        </div>
      </header>

      {/* Admin unlock */}
      {!isUnlocked && (
        <div className="max-w-5xl mx-auto p-4">
          <div className="rounded-xl border bg-white p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4" /> Admin Lock
            </div>
            <div className="text-sm text-slate-600">
              Employees can use the app normally. To edit shared boxes/guidelines and sync to other devices, enter the admin PIN.
            </div>
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Label htmlFor="pin">Admin PIN</Label>
                <Input id="pin" type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter PIN" />
                {pinError && <div className="text-sm text-red-600 mt-1">{pinError}</div>}
              </div>
              <Button onClick={unlock}>Unlock</Button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto p-4">
        <Tabs defaultValue="boxes">
          <TabsList>
            <TabsTrigger value="boxes">Boxes</TabsTrigger>
            <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          </TabsList>

          <TabsContent value="boxes" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-slate-600">{boxes.length} boxes</div>
              <Button variant="outline" className="gap-2" onClick={() => setBoxDialog({ open: true, box: { ...emptyBox } })}>
                <Plus className="h-4 w-4" /> Add Box
              </Button>
            </div>

            <div className="grid gap-2">
              {boxes.map((b) => (
                <div key={b.id} className="rounded-xl border bg-white p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{b.name}</div>
                    <div className="text-xs text-slate-500">{b.length} × {b.width} × {b.height} in {b.cost ? `• $${b.cost}` : ''}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setBoxDialog({ open: true, box: { ...b } })}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setDeleteDialog({ open: true, item: b, type: 'box' })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="guidelines" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <div className="text-sm text-slate-600">{guidelines.length} guidelines</div>
              <Button variant="outline" className="gap-2" onClick={() => setGuidelineDialog({ open: true, guideline: { ...emptyGuideline, materials: '' } })}>
                <Plus className="h-4 w-4" /> Add Guideline
              </Button>
            </div>

            <div className="grid gap-2">
              {guidelines.map((g) => (
                <div key={g.id} className="rounded-xl border bg-white p-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">{g.name}</div>
                    <div className="text-xs text-slate-500">
                      {g.sensitivity} • {g.weight_min}-{g.weight_max} lb • min padding {g.min_padding}"
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => setGuidelineDialog({ open: true, guideline: { ...g, materials: (g.materials || []).join('\n') } })}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => setDeleteDialog({ open: true, item: g, type: 'guideline' })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Box editor */}
        <Dialog open={boxDialog.open} onOpenChange={(o) => setBoxDialog({ open: o, box: o ? boxDialog.box : null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{boxDialog.box?.id ? 'Edit Box' : 'Add Box'}</DialogTitle>
            </DialogHeader>

            {boxDialog.box && (
              <div className="grid gap-3">
                <div>
                  <Label>Name</Label>
                  <Input value={boxDialog.box.name} onChange={(e) => setBoxDialog(s => ({ ...s, box: { ...s.box, name: e.target.value } }))} placeholder="e.g. 16x12x10" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Length</Label>
                    <Input value={boxDialog.box.length} onChange={(e) => setBoxDialog(s => ({ ...s, box: { ...s.box, length: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Width</Label>
                    <Input value={boxDialog.box.width} onChange={(e) => setBoxDialog(s => ({ ...s, box: { ...s.box, width: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Height</Label>
                    <Input value={boxDialog.box.height} onChange={(e) => setBoxDialog(s => ({ ...s, box: { ...s.box, height: e.target.value } }))} />
                  </div>
                </div>
                <div>
                  <Label>Cost (optional)</Label>
                  <Input value={boxDialog.box.cost ?? ''} onChange={(e) => setBoxDialog(s => ({ ...s, box: { ...s.box, cost: e.target.value } }))} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setBoxDialog({ open: false, box: null })}>Cancel</Button>
              <Button onClick={handleSaveBox}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Guideline editor */}
        <Dialog open={guidelineDialog.open} onOpenChange={(o) => setGuidelineDialog({ open: o, guideline: o ? guidelineDialog.guideline : null })}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{guidelineDialog.guideline?.id ? 'Edit Guideline' : 'Add Guideline'}</DialogTitle>
            </DialogHeader>

            {guidelineDialog.guideline && (
              <div className="grid gap-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Name</Label>
                    <Input value={guidelineDialog.guideline.name} onChange={(e) => setGuidelineDialog(s => ({ ...s, guideline: { ...s.guideline, name: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Sensitivity</Label>
                    <Input value={guidelineDialog.guideline.sensitivity} onChange={(e) => setGuidelineDialog(s => ({ ...s, guideline: { ...s.guideline, sensitivity: e.target.value } }))} placeholder="basic / standard / fragile / custom" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Weight Min</Label>
                    <Input value={guidelineDialog.guideline.weight_min} onChange={(e) => setGuidelineDialog(s => ({ ...s, guideline: { ...s.guideline, weight_min: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Weight Max</Label>
                    <Input value={guidelineDialog.guideline.weight_max} onChange={(e) => setGuidelineDialog(s => ({ ...s, guideline: { ...s.guideline, weight_max: e.target.value } }))} />
                  </div>
                  <div>
                    <Label>Min Padding (in)</Label>
                    <Input value={guidelineDialog.guideline.min_padding} onChange={(e) => setGuidelineDialog(s => ({ ...s, guideline: { ...s.guideline, min_padding: e.target.value } }))} />
                  </div>
                </div>

                <div>
                  <Label>Materials (one per line)</Label>
                  <textarea
                    className="w-full min-h-[140px] rounded-md border p-2 text-sm"
                    value={guidelineDialog.guideline.materials || ''}
                    onChange={(e) => setGuidelineDialog(s => ({ ...s, guideline: { ...s.guideline, materials: e.target.value } }))}
                    placeholder="Appropriate corrugated box...\nVoid fill...\nTape..."
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Input value={guidelineDialog.guideline.notes || ''} onChange={(e) => setGuidelineDialog(s => ({ ...s, guideline: { ...s.guideline, notes: e.target.value } }))} />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setGuidelineDialog({ open: false, guideline: null })}>Cancel</Button>
              <Button onClick={handleSaveGuideline}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirm */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(o) => setDeleteDialog(s => ({ ...s, open: o }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the selected {deleteDialog.type}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteDialog({ open: false, item: null, type: null })}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
