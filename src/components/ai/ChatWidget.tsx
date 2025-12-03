import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Mic, MicOff, Volume2, VolumeX, Loader2, Keyboard } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/stores/aiStore";
import { useAIChat } from "@/hooks/useAIChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { toast } from "@/hooks/use-toast";
import { VoiceConversation } from "./VoiceConversation";
import { AudioWaveform } from "./AudioWaveform";

// You'll need to create an ElevenLabs agent and put its ID here
// Create one at: https://elevenlabs.io/conversational-ai
const ELEVENLABS_AGENT_ID = "agent_5701kbggr4yyef0ttsf3pszm1hcr";

export function ChatWidget() {
  const [inputValue, setInputValue] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [showNotification, setShowNotification] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Hide notification after opening chat or after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(false);
    }, 10000); // Hide after 10 seconds
    return () => clearTimeout(timer);
  }, []);

  const { messages, isChatOpen, isProcessing, toggleChat, addMessage } = useAIStore();

  const handleToggleChat = () => {
    setShowNotification(false);
    toggleChat();
  };

  const { sendMessage, isLoading } = useAIChat();

  const {
    speak,
    stop: stopSpeaking,
    isSpeaking,
    isLoading: isTTSLoading,
  } = useTextToSpeech({
    onError: (error) => {
      toast({
        title: "Voice Error",
        description: error,
        variant: "destructive",
      });
    },
  });

  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported: isVoiceSupported,
  } = useVoiceInput({
    onResult: (text) => {
      setInputValue(text);
      handleSendMessage(text, true);
    },
    onError: (error) => {
      toast({
        title: "Voice Input Error",
        description: error,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  useEffect(() => {
    if (isListening && transcript) {
      setInputValue(transcript);
    }
  }, [isListening, transcript]);

  const handleSendMessage = async (text: string = inputValue, isVoice: boolean = false) => {
    const messageText = text.trim();
    if (!messageText || isLoading) return;

    setInputValue("");

    addMessage({
      role: "user",
      content: messageText,
      isVoice,
    });

    try {
      const response = await sendMessage(messageText, messages, isVoice);

      addMessage({
        role: "assistant",
        content: response,
      });

      if (voiceEnabled) {
        await speak(response);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get a response. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toggleVoiceOutput = () => {
    if (isSpeaking) {
      stopSpeaking();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const handleVoiceMessage = (message: { role: string; content: string }) => {
    addMessage({
      role: message.role as "user" | "assistant",
      content: message.content,
      isVoice: true,
    });
  };

  return (
    <>
      {/* Notification bubble */}
      {showNotification && !isChatOpen && (
        <div 
          className={cn(
            "fixed bottom-[5.5rem] right-6 z-50",
            "bg-card border border-border rounded-2xl shadow-lg px-4 py-3",
            "animate-fade-in",
            "max-w-[200px]"
          )}
        >
          <p className="text-sm text-foreground font-medium">May I help you? 👋</p>
          <div className="absolute -bottom-2 right-8 w-4 h-4 bg-card border-b border-r border-border rotate-45" />
        </div>
      )}

      {/* Voice Assistant Toggle Button - Siri-like */}
      <div className={cn(
        "fixed bottom-6 right-6 z-50",
        isChatOpen && "scale-0 opacity-0 pointer-events-none",
      )}>
        {/* Ping effect around entire button */}
        <span className="absolute inset-0 rounded-full bg-primary/50 animate-ping-slow"></span>
        <button
          onClick={handleToggleChat}
          className={cn(
            "relative h-16 w-16 rounded-full",
            "bg-gradient-to-br from-primary/80 via-primary/70 to-accent/80",
            "shadow-[0_0_30px_rgba(var(--primary),0.4)]",
            "transition-all duration-500 hover:scale-110",
            "flex items-center justify-center",
            "overflow-hidden",
          )}
          aria-label="Talk to your assistant"
        >
          <div className="relative z-10">
            <AudioWaveform isActive={true} isSpeaking={false} barCount={5} className="h-6" />
          </div>
        </button>
      </div>

      {/* Assistant Panel */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]",
          "bg-card/95 backdrop-blur-xl border border-border/50 rounded-3xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out",
          isChatOpen ? "opacity-100 translate-y-0 h-[32rem]" : "opacity-0 translate-y-8 h-0 pointer-events-none",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <AudioWaveform isActive={mode === "voice"} isSpeaking={false} barCount={3} className="h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Your Assistant</h3>
              <p className="text-xs text-muted-foreground">
                {mode === "voice" ? "Ready to help" : "Type your question"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleToggleChat} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {mode === "voice" ? (
            /* Voice Mode - Primary */
            <div className="flex-1 flex flex-col">
              <VoiceConversation
                agentId={ELEVENLABS_AGENT_ID}
                onMessage={handleVoiceMessage}
                onClose={() => setMode("text")}
              />
              
              {/* Switch to text option */}
              <div className="p-4 border-t border-border/30">
                <button
                  onClick={() => setMode("text")}
                  className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Keyboard className="h-4 w-4" />
                  <span>Prefer to type?</span>
                </button>
              </div>
            </div>
          ) : (
            /* Text Mode - Secondary */
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <ScrollArea className="flex-1 min-h-0 h-full" ref={scrollAreaRef}>
                <div className="p-4">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mb-4">
                      <MessageCircle className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <h4 className="font-medium text-foreground mb-2">Text Chat</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Type your question or try these:
                    </p>
                    <div className="space-y-2 w-full">
                      {[
                        "Show me sci-fi books",
                        "Recommend something inspiring",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => handleSendMessage(suggestion)}
                          className="w-full text-left text-sm p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        >
                          "{suggestion}"
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-4 py-2.5",
                            message.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md",
                          )}
                        >
                          {message.role === "assistant" ? (
                            <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown
                                components={{
                                  p: ({ children }) => <p className="my-1">{children}</p>,
                                  ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                                  li: ({ children }) => <li className="my-0.5">{children}</li>,
                                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          )}
                          {message.isVoice && (
                            <div className="flex items-center gap-1 mt-1 opacity-60">
                              <Mic className="h-3 w-3" />
                              <span className="text-xs">Voice</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </ScrollArea>

              {/* Text Input Area */}
              <div className="shrink-0 p-4 border-t border-border/50 bg-muted/20">
                <div className="flex items-center gap-2">
                  {isVoiceSupported && (
                    <Button
                      variant={isListening ? "default" : "outline"}
                      size="icon"
                      onClick={toggleVoiceInput}
                      disabled={isLoading || isTTSLoading}
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-full transition-all",
                        isListening && "bg-red-500 hover:bg-red-600 animate-pulse",
                      )}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={isListening ? "Listening..." : "Type a message..."}
                    disabled={isLoading || isListening}
                    className="flex-1 rounded-full"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={!inputValue.trim() || isLoading}
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                
                {/* Back to voice */}
                <button
                  onClick={() => setMode("voice")}
                  className="w-full mt-3 flex items-center justify-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <AudioWaveform isActive={true} isSpeaking={false} barCount={3} className="h-3" />
                  <span>Switch to voice</span>
                </button>
                
                {isSpeaking && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Volume2 className="h-3 w-3 animate-pulse text-primary" />
                    <span>Speaking...</span>
                    <button onClick={stopSpeaking} className="text-primary hover:underline">
                      Stop
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
