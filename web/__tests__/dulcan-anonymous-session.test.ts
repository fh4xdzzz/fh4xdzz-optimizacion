import { beforeEach, describe, expect, it, vi } from 'vitest'
const mock=vi.hoisted(()=>({ getUser:vi.fn() }))
vi.mock('@/lib/supabase/client',()=>({createClient:()=>({auth:{getUser:mock.getUser}})}))
import { getSession } from '@/lib/auth-hybrid'
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv('NEXT_PUBLIC_AUTH_MODE','supabase');vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://fixture.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','fixture')})
describe('anonymous buyer session',()=>{
 it('treats a missing session as anonymous while retaining verified getUser authentication',async()=>{
  const logger=vi.spyOn(console,'error').mockImplementation(()=>{})
  mock.getUser.mockResolvedValue({data:{user:null},error:{name:'AuthSessionMissingError'}})
  expect(await getSession()).toBeNull();expect(mock.getUser).toHaveBeenCalledOnce();expect(logger).not.toHaveBeenCalled();logger.mockRestore()
 })
 it('does not treat an actual authentication failure as a valid session',async()=>{
  const logger=vi.spyOn(console,'error').mockImplementation(()=>{})
  mock.getUser.mockResolvedValue({data:{user:null},error:{name:'AuthApiError',message:'Invalid token'}})
  expect(await getSession()).toBeNull();expect(logger).toHaveBeenCalledOnce();logger.mockRestore()
 })
})
