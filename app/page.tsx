import { Chatbot } from "@/components/chatbot"

export const metadata = {
  title: 'Grok Chatbot',
  description: 'A chatbot powered by xAI Grok',
}

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="w-full">
        <Chatbot />
      </div>
    </div>
  )
}
