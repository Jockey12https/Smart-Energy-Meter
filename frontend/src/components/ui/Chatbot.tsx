import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I am your Smart Energy Assistant. Ask me about your energy usage, or anything else!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // We assume user_id is passed down or retrieved from context/auth
      // For this generic component, we might mock it or pass it as prop
      const userId = 'user_abc'; // Replace with actual user ID logic if available
      
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          message: userMessage,
          history: messages.slice(-5) // Send last 5 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || "Sorry, I didn't understand that." }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 w-80 md:w-96 shadow-2xl z-50 rounded-xl overflow-hidden border border-border"
          >
            <Card className="border-0 rounded-xl shadow-none h-[500px] flex flex-col">
              <CardHeader className="bg-primary text-primary-foreground p-4 flex flex-row items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center space-x-2">
                  <Bot size={20} />
                  <CardTitle className="text-lg font-medium">Energy Assistant</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary/90 h-8 w-8" onClick={() => setIsOpen(false)}>
                  <X size={18} />
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-grow overflow-hidden bg-background">
                <ScrollArea className="h-full p-4" ref={scrollRef}>
                  <div className="flex flex-col space-y-4">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`p-2 rounded-full flex-shrink-0 ${msg.role === 'user' ? 'bg-primary/10 ml-2' : 'bg-muted mr-2'}`}>
                            {msg.role === 'user' ? <User size={14} className="text-primary" /> : <Bot size={14} className="text-foreground" />}
                          </div>
                          <div className={`p-3 rounded-2xl text-sm text-black ${msg.role === 'user' ? 'bg-primary/20 rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="flex items-center space-x-2 bg-muted text-black p-3 rounded-2xl rounded-tl-sm">
                          <Loader2 size={16} className="animate-spin text-black" />
                          <span className="text-sm text-black">Thinking...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter className="p-3 bg-card border-t shrink-0">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
                  className="flex w-full items-center space-x-2"
                >
                  <Input 
                    placeholder="Ask about your energy..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    className="flex-grow rounded-full bg-muted/50 border-transparent focus-visible:ring-1 focus-visible:ring-primary"
                  />
                  <Button type="submit" size="icon" disabled={!input.trim() || isLoading} className="rounded-full shadow-sm">
                    <Send size={16} className={input.trim() ? "translate-x-[2px]" : ""} />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageCircle size={24} className="text-white" />
      </Button>
    </>
  );
}
