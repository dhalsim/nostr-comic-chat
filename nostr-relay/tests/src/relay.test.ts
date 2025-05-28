import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { SimplePool, finalizeEvent, EventTemplate } from 'nostr-tools'

const RELAY_URL = 'ws://localhost:3334'
const MESSAGE_KIND = 7353

// Character keys
const character1 = {
  secretKey: '9850d68cd50939faa112d5df0273d7d75419e6c47e06d7316af8245253049c2e',
  publicKey: 'fda5bf2719b5d7ebaa2fc08f2dd55ba1fec5a42ef84d38929918bf35cae96c37'
}

const character2 = {
  secretKey: '8b81834146b9500c5551398bf6a79a30db892587b256dc09a875bec8fa5331af',
  publicKey: 'd72615ac2ccd79b06962b0dd6243d8112b6939612c01f277931a428746a77297'
}

describe('Nostr Relay Tests', () => {
  let pool: SimplePool

  beforeAll(() => {
    pool = new SimplePool()
  })

  afterAll(() => {
    pool.close([RELAY_URL])
  })

  it('should be able to publish and receive an event', async () => {
    const event: EventTemplate = {
      kind: MESSAGE_KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: 'Hello from character1!',
    }

    // Sign the event
    const signedEvent = finalizeEvent(event, Buffer.from(character1.secretKey, 'hex'))
    
    // Publish the event
    return Promise.all(pool.publish([RELAY_URL], signedEvent)).then(() => {
      return new Promise((resolve) => {
        // Subscribe to verify the event was published
        const sub = pool.subscribe([RELAY_URL], {
          kinds: [MESSAGE_KIND],
          authors: [character1.publicKey],
          limit: 1
        }, {
          onevent(evt) {
            expect(evt.content).toBe('Hello from character1!')
            
            sub.close()
            resolve(void 0)
          },
        })
      })
    })
  })
})
