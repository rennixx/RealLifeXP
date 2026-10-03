import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

type DeleteAccountResponse = {
  ok: boolean;
  status: 'deleted' | 'already_deleted';
  message: string;
};
type FunctionErrorResponse = {
  error: string;
  message: string;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

function responseJson(payload: DeleteAccountResponse | FunctionErrorResponse, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json',
    },
  });
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  if (!header.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return header.slice(7).trim();
}

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return responseJson({ error: 'Method not allowed', message: 'Method not allowed' }, 405);
    }

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return responseJson(
        { error: 'Authorization header required', message: 'Authorization header required' },
        401,
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE');

    if (!supabaseUrl || !serviceRoleKey) {
      return responseJson(
        { error: 'Server missing Supabase service role configuration.', message: 'Server missing Supabase service role configuration.' },
        500,
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userResult, error: getUserError } = await supabase.auth.getUser(accessToken);
    if (getUserError || !userResult.user) {
      return responseJson({ error: 'Unauthorized user token.', message: 'Unauthorized user token.' }, 401);
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(userResult.user.id);
    if (deleteError) {
      const message = deleteError.message.toLowerCase();
      if (message.includes('user not found') || message.includes('no rows found')) {
        const payload: DeleteAccountResponse = {
          ok: true,
          status: 'already_deleted',
          message: 'Account was already removed.',
        };
        return responseJson(payload);
      }

      return responseJson(
        { error: 'Failed to delete account.', message: deleteError.message },
        500,
      );
    }

    const payload: DeleteAccountResponse = {
      ok: true,
      status: 'deleted',
      message: 'Account removed successfully.',
    };
    return responseJson(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error while deleting account.';
    return responseJson({ error: 'Unhandled server error.', message }, 500);
  }
});
