'use client';

import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/lib/stores/uiStore';
import { 
  RefreshCw, 
  Monitor, 
  Tablet, 
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface PreviewToolbarProps {
  onRefresh: () => void;
}

export function PreviewToolbar({ onRefresh }: PreviewToolbarProps) {
  const { previewMode, setPreviewMode } = useUIStore();

  const previewModes = [
    { id: 'desktop', icon: Monitor, label: 'Desktop' },
    { id: 'tablet', icon: Tablet, label: 'Tablet' },
    { id: 'mobile', icon: Smartphone, label: 'Mobile' },
  ] as const;

  return (
    <div className="flex items-center justify-between p-3 border-b border-border bg-background">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Preview</h3>
        
        {/* Device Mode Selector */}
        <div className="flex items-center bg-muted rounded-md p-1">
          {previewModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <Button
                key={mode.id}
                size="sm"
                variant={previewMode === mode.id ? 'default' : 'ghost'}
                onClick={() => setPreviewMode(mode.id)}
                className={cn(
                  'h-7 px-2',
                  previewMode === mode.id && 'bg-background shadow-sm'
                )}
                title={mode.label}
              >
                <Icon className="h-3 w-3" />
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Refresh Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          className="h-7 px-2"
          title="Refresh Preview"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>

        {/* Open in New Tab */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            // This would open the preview in a new tab
            // Implementation depends on how you want to serve the preview
            console.log('Open in new tab');
          }}
          className="h-7 px-2"
          title="Open in New Tab"
        >
          <ExternalLink className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
