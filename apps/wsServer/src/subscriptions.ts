import type { WebSocket } from "ws";

const rooms = new Map<string, Set<WebSocket>>();
const clientRooms = new WeakMap<WebSocket, Set<string>>();

function getClientRooms(ws: WebSocket) {
  let joinedRooms = clientRooms.get(ws);
  if (!joinedRooms) {
    joinedRooms = new Set<string>();
    clientRooms.set(ws, joinedRooms);
  }
  return joinedRooms;
}

export function subscribe(ws: WebSocket, room: string) {
  if (!rooms.has(room)) {
    rooms.set(room, new Set());
  }
  rooms.get(room)!.add(ws);
  getClientRooms(ws).add(room);
}

export function unsubscribe(ws: WebSocket, room: string) {
  rooms.get(room)?.delete(ws);
  getClientRooms(ws).delete(room);
}

export function removeClient(ws: WebSocket) {
  const joinedRooms = clientRooms.get(ws);
  if (!joinedRooms) return;

  for (const room of joinedRooms) {
    rooms.get(room)?.delete(ws);
  }
  clientRooms.delete(ws);
}

export function broadcast(room: string, message: string) {
  const peopleInRoom = rooms.get(room);
  if (!peopleInRoom) return;

  for (const ws of peopleInRoom) {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  }
}
