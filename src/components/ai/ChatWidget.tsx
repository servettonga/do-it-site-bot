import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Mic, MicOff, Volume2, VolumeX, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAIStore } from "@/stores/aiStore";
import { useAIChat } from "@/hooks/useAIChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { toast } from "@/hooks/use-toast";
import { VoiceConversation } from "./VoiceConversation";

// You'll need to create an ElevenLabs agent and put its ID here
// Create one at: https://elevenlabs.io/conversational-ai
const ELEVENLABS_AGENT_ID = "agent_5701kbggr4yyef0ttsf3pszm1hcr";

export function ChatWidget() {
  const [inputValue, setInputValue] = useState("");
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [mode, setMode] = useState<"chat" | "voice">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, isChatOpen, isProcessing, toggleChat, addMessage } = useAIStore();

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
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
      {/* Chat Toggle Button */}
      <Button
        onClick={toggleChat}
        className={cn(
          "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg",
          "bg-primary hover:bg-primary/90 text-primary-foreground",
          "transition-all duration-300 hover:scale-105",
          isChatOpen && "scale-0 opacity-0",
        )}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      {/* Chat Window */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]",
          "bg-card border border-border rounded-2xl shadow-2xl",
          "flex flex-col overflow-hidden",
          "transition-all duration-300 ease-out",
          isChatOpen ? "opacity-100 translate-y-0 h-[32rem]" : "opacity-0 translate-y-8 h-0 pointer-events-none",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              {mode === "voice" ? (
                <Phone className="h-5 w-5 text-primary" />
              ) : (
                <MessageCircle className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground">BookHaven Assistant</h3>
              <p className="text-xs text-muted-foreground">
                {mode === "voice"
                  ? "Real-time voice conversation"
                  : isProcessing
                    ? "Thinking..."
                    : "Ask me anything about books"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {mode === "chat" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleVoiceOutput}
                className="h-8 w-8"
                title={voiceEnabled ? "Disable voice responses" : "Enable voice responses"}
              >
                {voiceEnabled ? (
                  <Volume2 className="h-4 w-4 text-primary" />
                ) : (
                  <VolumeX className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={toggleChat} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as "chat" | "voice")} className="flex-1 flex flex-col">
          <div className="px-4 pt-2">
            <TabsList className="w-full">
              <TabsTrigger value="chat" className="flex-1 gap-2">
                <MessageCircle className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="voice" className="flex-1 gap-2">
                <Phone className="h-4 w-4" />
                Voice Call
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Chat Mode */}
          <TabsContent value="chat" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <MessageCircle className="h-8 w-8 text-primary" />
                  </div>
                  <h4 className="font-medium text-foreground mb-2">Welcome to BookHaven!</h4>
                  <p className="text-sm text-muted-foreground">
                    I can help you find books, add them to your cart, and navigate the store. Try asking:
                  </p>
                  <div className="mt-4 space-y-2 w-full">
                    {[
                      "Show me sci-fi books",
                      "I want something like The Midnight Library",
                      "Add Atomic Habits to my cart",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSendMessage(suggestion)}
                        className="w-full text-left text-sm p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
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
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-muted/30">
              <div className="flex items-center gap-2">
                {isVoiceSupported && (
                  <Button
                    variant={isListening ? "default" : "outline"}
                    size="icon"
                    onClick={toggleVoiceInput}
                    disabled={isLoading || isTTSLoading}
                    className={cn(
                      "h-10 w-10 shrink-0 transition-all",
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
                  placeholder={isListening ? "Listening..." : "Ask about books..."}
                  disabled={isLoading || isListening}
                  className="flex-1"
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className="h-10 w-10 shrink-0"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
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
          </TabsContent>

          {/* Voice Call Mode */}
          <TabsContent value="voice" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
            <div className="flex-1 flex items-center justify-center">
              <VoiceConversation
                agentId={ELEVENLABS_AGENT_ID}
                onMessage={handleVoiceMessage}
                onClose={() => setMode("chat")}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
