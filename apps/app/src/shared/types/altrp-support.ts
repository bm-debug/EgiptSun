import { 
    Message, 
    MessageThread, 
    NewMessage,
    NewMessageThread,
 } from '../schema/types'
import { altrpHuman } from './altrp'

export interface altrpSupportMessage extends Message {
    dataIn: altrpSupportMessageDataIn
}
export interface NewaltrpSupportMessage extends NewMessage {
    dataIn: altrpSupportMessageDataIn
}
export interface altrpSupportMessageDataIn {
    humanHaid: altrpHuman['haid']
    content: string
    messageType: altrpSupportMessageType
    mediaUuid?: string // UUID of uploaded media file (for photo/document messages)
    sender_role: 'admin' | 'client'
    admin_viewed_at?: string
    client_viewed_at?: string
}
export type altrpSupportMessageType = 'text' | 'voice' | 'photo' | 'document'

export interface altrpSupportChat extends MessageThread {
    type: 'SUPPORT'
    dataIn: altrpSupportChatDataIn

}
export interface NewaltrpSupportChat extends NewMessageThread {
    dataIn?: altrpSupportChatDataIn
    type: 'SUPPORT'
}
export interface altrpSupportChatDataIn {
    humanHaid: altrpHuman['haid']
    managerHaid?: altrpHuman['haid']
}