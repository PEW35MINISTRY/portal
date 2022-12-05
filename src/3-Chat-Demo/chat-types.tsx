export type SocketContact = {
    userId: number,
    displayName: string,
    socketId: string
}

export type SocketMessage = {
    senderId: number,
    senderName?: string,
    recipientId: number,
    recipientName?: string,
    message: string,
    time?: number,
}

export type Contact = {//Either User or Circle
    id: number;
    name: string;
}