import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[75%] sm:text-base ${
          isUser
            ? 'rounded-br-md bg-indigo-600 text-white'
            : 'rounded-bl-md bg-slate-100 text-slate-800'
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 border-t border-slate-200 pt-2">
            <p className="text-xs font-medium text-slate-500">Sources</p>
            <ul className="mt-1 space-y-0.5">
              {message.sources.map((source) => (
                <li key={source} className="text-xs text-slate-500">
                  {source}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
