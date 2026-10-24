import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { PDFDocument } from 'npm:pdf-lib@1.17.1';
import { criarFinalizador } from './handler.js';

Deno.serve(criarFinalizador({ createClient, PDFDocument, ambiente: nome => Deno.env.get(nome) }));
