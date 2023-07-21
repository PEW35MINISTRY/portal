export type SocketContact = {
    userID: number,
    displayName: string,
    socketID: string
}

export type SocketMessage = {
    senderID: number,
    senderName?: string,
    recipientID: number,
    recipientName?: string,
    message: string,
    time?: number,
}

export type Contact = {//Either User or Circle
    ID: number;
    name: string;
}