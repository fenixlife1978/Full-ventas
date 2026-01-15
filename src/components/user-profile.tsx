'use client'

import { PlaceHolderImages } from '@/lib/placeholder-images'
import Image from 'next/image'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MoreHorizontal } from 'lucide-react'
import { Button } from './ui/button'
import { useSidebar } from './ui/sidebar'

export function UserProfile() {
  const userAvatar = PlaceHolderImages.find((img) => img.id === 'user-avatar')
  const { state } = useSidebar()

  return (
    <div className="flex items-center justify-between p-2">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {userAvatar && (
            <AvatarImage
              src={userAvatar.imageUrl}
              alt="User Avatar"
              width={40}
              height={40}
              data-ai-hint={userAvatar.imageHint}
            />
          )}
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <div
          className={`flex flex-col text-sm overflow-hidden transition-all duration-300 ${
            state === 'collapsed' ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}
        >
          <span className="font-semibold text-sidebar-foreground truncate">
            John Doe
          </span>
          <span className="text-xs text-sidebar-foreground/70 truncate">
            john.doe@example.com
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className={`text-sidebar-foreground/70 hover:text-sidebar-foreground h-8 w-8 transition-opacity duration-300 ${
          state === 'collapsed' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </div>
  )
}
