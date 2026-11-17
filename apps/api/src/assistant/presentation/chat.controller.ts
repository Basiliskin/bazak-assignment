import { Body, Controller, Post, Res } from '@nestjs/common';
import { ChatRequestSchema, type ChatRequest } from '@app/contracts';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeReadableStream } from 'node:stream/web';
import { ZodValidationPipe } from '../../shared/presentation/zod-validation.pipe.js';
import { ChatTurnService } from '../application/chat-turn.service.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly turns: ChatTurnService) {}

  /** Streams one Assistant turn (SSE, AI SDK UI message protocol). Body: only the new Message (ADR 0003). */
  @Post()
  async chat(
    @Body(new ZodValidationPipe(ChatRequestSchema)) body: ChatRequest,
    @Res() res: Response,
  ): Promise<void> {
    const { headers, body: stream } = await this.turns.run(body);
    res.writeHead(200, headers);
    const node = Readable.fromWeb(stream as NodeReadableStream<Uint8Array>);
    // If the Shopper closes the tab, keep draining so the reply still finishes and gets saved.
    res.on('close', () => {
      if (!res.writableFinished) node.unpipe(res).resume();
    });
    node.pipe(res);
  }
}
