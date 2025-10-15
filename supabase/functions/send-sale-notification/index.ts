import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface SaleData {
  id: string;
  customer_name: string;
  issuer_name: string;
  total_amount: number;
  created_at: string;
  items: SaleItem[];
}

interface RequestBody {
  saleId: string;
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { saleId }: RequestBody = await req.json();

    if (!saleId) {
      return new Response(
        JSON.stringify({ error: 'Sale ID is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: emailSettings } = await supabase
      .from('email_settings')
      .select('notification_email, send_on_sale, email_subject_template')
      .maybeSingle();

    if (!emailSettings || !emailSettings.send_on_sale) {
      return new Response(
        JSON.stringify({ message: 'Email notifications are disabled' }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: sale } = await supabase
      .from('sales')
      .select('id, customer_name, issuer_name, total_amount, created_at')
      .eq('id', saleId)
      .maybeSingle();

    if (!sale) {
      return new Response(
        JSON.stringify({ error: 'Sale not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: items } = await supabase
      .from('sale_items')
      .select('product_name, quantity, unit_price, total_price')
      .eq('sale_id', saleId);

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Sale items not found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: companySettings } = await supabase
      .from('company_settings')
      .select('company_name, address, email, phone, currency_symbol')
      .maybeSingle();

    const saleData: SaleData = {
      ...sale,
      items,
    };

    const emailHtml = generateEmailHtml(saleData, companySettings);

    console.log('Email notification prepared for:', emailSettings.notification_email);
    console.log('Sale ID:', saleId);
    console.log('Email HTML length:', emailHtml.length);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email notification processed',
        saleId: saleId,
        recipient: emailSettings.notification_email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-sale-notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function generateEmailHtml(sale: SaleData, companySettings: any): string {
  const currencySymbol = companySettings?.currency_symbol || '₦';
  const companyName = companySettings?.company_name || 'YAROTECH NETWORK LIMITED';
  const companyAddress = companySettings?.address || 'No. 122 Lukoro Plaza, Farm Center, Kano State';
  const companyEmail = companySettings?.email || 'info@yarotech.com.ng';
  const companyPhone = companySettings?.phone || '+234 814 024 4774';

  const saleDate = new Date(sale.created_at);
  const formattedDate = saleDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const invoiceId = sale.id.substring(0, 8).toUpperCase();

  let itemsHtml = '';
  sale.items.forEach((item) => {
    itemsHtml += `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.product_name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencySymbol}${item.unit_price.toFixed(2)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${currencySymbol}${item.total_price.toFixed(2)}</td>
      </tr>
    `;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sale Receipt</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f9fafb; padding: 30px; border-radius: 10px; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6;">
          <h1 style="color: #1f2937; margin: 0; font-size: 28px;">${companyName}</h1>
          <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">${companyAddress}</p>
          <p style="color: #6b7280; margin: 5px 0; font-size: 14px;">
            Email: ${companyEmail} | Phone: ${companyPhone}
          </p>
        </div>

        <div style="background-color: white; padding: 25px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #3b82f6; margin-top: 0; font-size: 22px;">INVOICE / RECEIPT</h2>
          
          <div style="margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Invoice ID:</strong> ${invoiceId}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Customer:</strong> ${sale.customer_name}</p>
            <p style="margin: 5px 0;"><strong>Issued by:</strong> ${sale.issuer_name}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #3b82f6; color: white;">
                <th style="padding: 12px; text-align: left;">Qty</th>
                <th style="padding: 12px; text-align: left;">Item Name</th>
                <th style="padding: 12px; text-align: right;">Unit Price</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <div style="text-align: right;">
              <p style="font-size: 18px; margin: 0;">
                <strong>Grand Total:</strong> 
                <span style="color: #3b82f6; font-size: 24px; font-weight: bold;">${currencySymbol}${sale.total_amount.toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>

        <div style="text-align: center; color: #6b7280; font-size: 14px;">
          <p style="font-style: italic; margin: 10px 0;">Thank you for your purchase!</p>
          <p style="margin: 5px 0;">Generated by: ${sale.issuer_name}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
