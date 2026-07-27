import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

import { getCurrentAgent } from '@/lib/auth/current-agent'
import { ACCEPTED_IMAGE_TYPES, MAX_IMAGE_BYTES } from '@/lib/blob'

/**
 * Issues short-lived tokens so the browser uploads straight to Vercel Blob.
 *
 * This exists specifically to avoid routing image bytes through a serverless
 * function: Vercel caps request bodies at ~4.5 MB, which a couple of phone
 * photos blow straight past. The file never touches our compute — only the
 * token request and the completion callback do.
 */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // Runs before every file. Anyone without a session gets no token.
        const agent = await getCurrentAgent()

        if (!agent) {
          throw new Error('Not authenticated')
        }

        return {
          allowedContentTypes: [...ACCEPTED_IMAGE_TYPES],
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ agentId: agent.id }),
        }
      },
      onUploadCompleted: async () => {
        // Nothing to do: the URL is persisted when the listing form is submitted.
        // (This callback is not invoked on localhost — Vercel Blob can't reach
        // a local dev server. Not a problem, since we don't depend on it.)
      },
    })

    return Response.json(jsonResponse)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 },
    )
  }
}
