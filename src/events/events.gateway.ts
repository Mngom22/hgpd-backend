import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('EventsGateway');

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);

        // Si l'utilisateur est un admin, on peut le rejoindre dans une room spécifique
        const userRole = client.handshake.query.role;
        const userId = client.handshake.query.userId;
        
        if (userRole === 'admin') {
            client.join('admin');
            this.logger.log(`Admin joined room: ${client.id}`);
        }
        
        // Providers peuvent rejoindre une room spécifique
        if (userRole === 'provider' && userId) {
            client.join(`provider_${userId}`);
            this.logger.log(`Provider ${userId} joined room: ${client.id}`);
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    emitToAdmin(event: string, payload: any) {
        this.server.to('admin').emit(event, payload);
    }

    emitToAll(event: string, payload: any) {
        this.server.emit(event, payload);
    }

    emitToUser(userId: string, event: string, payload: any) {
        this.server.to(userId).emit(event, payload);
    }

    emitToProvider(providerId: string, event: string, payload: any) {
        this.server.to(`provider_${providerId}`).emit(event, payload);
    }
}
