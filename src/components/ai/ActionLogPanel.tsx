import { useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAIStore } from '@/stores/aiStore';
import { actionTypeLabels, AIAction } from '@/types/ai';

export function ActionLogPanel() {
  const { actions, isActionLogOpen, toggleActionLog, clearActions } = useAIStore();
  const [isHovered, setIsHovered] = useState(false);

  const getStatusIcon = (status: AIAction['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActionColor = (type: string) => {
    const colors: Record<string, string> = {
      search: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      navigate: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      add_to_cart: 'bg-green-500/10 text-green-500 border-green-500/20',
      remove_from_cart: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      filter: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      recommend: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      view_details: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      clear_cart: 'bg-red-500/10 text-red-500 border-red-500/20',
      checkout: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      thinking: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      voice_input: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
      voice_output: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20',
    };
    return colors[type] || 'bg-muted text-muted-foreground';
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      {/* Toggle Button - Always visible on left side */}
      <div
        className={cn(
          "fixed left-0 top-1/2 -translate-y-1/2 z-40",
          "transition-all duration-300",
          isActionLogOpen ? "translate-x-80" : "translate-x-0"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={toggleActionLog}
          className={cn(
            "h-24 w-6 rounded-l-none rounded-r-lg border-l-0",
            "bg-card/95 backdrop-blur-sm shadow-lg",
            "hover:w-8 transition-all duration-200",
            "flex items-center justify-center"
          )}
        >
          {isActionLogOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        
        {/* Hover tooltip */}
        {!isActionLogOpen && isHovered && (
          <div className="absolute left-8 top-1/2 -translate-y-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs whitespace-nowrap shadow-lg border">
            Action Log ({actions.length})
          </div>
        )}
      </div>

      {/* Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 h-full w-80 z-30",
          "bg-card/95 backdrop-blur-md border-r border-border shadow-xl",
          "transition-all duration-300 ease-out",
          isActionLogOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h3 className="font-semibold text-foreground">Action Log</h3>
            <p className="text-xs text-muted-foreground">
              {actions.length} action{actions.length !== 1 ? 's' : ''} recorded
            </p>
          </div>
          {actions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearActions}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Actions List */}
        <ScrollArea className="h-[calc(100vh-5rem)]">
          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No actions yet. Start chatting with the AI assistant to see actions here.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={cn(
                    "p-3 rounded-lg border bg-card",
                    "transition-all duration-200",
                    action.status === 'pending' && "animate-pulse"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-medium", getActionColor(action.type))}
                    >
                      {actionTypeLabels[action.type] || action.type}
                    </Badge>
                    {getStatusIcon(action.status)}
                  </div>
                  
                  <p className="text-sm text-foreground mb-1">
                    {action.description}
                  </p>
                  
                  {action.result && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {action.result}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatTime(action.timestamp)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
}
