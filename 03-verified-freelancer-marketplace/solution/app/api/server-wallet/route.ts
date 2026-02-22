import { createServerWalletHandler } from '@bsv/simple/server'
const handler = createServerWalletHandler({ requestMemo: 'Freelancer marketplace funding' })
export const GET = handler.GET, POST = handler.POST
