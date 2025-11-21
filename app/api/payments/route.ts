export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json()

    const {
      org_id,
      student_id,
      student_name,
      amount,
      payment_method,
      revenue_category_id,
      revenue_category_name,
      class_credits,
      study_room_pass,
      notes,
    } = body

    let creditId: string | null = null
    let passId: string | null = null

    // 1. Create Class Credit if provided
    if (class_credits && class_credits.hours > 0) {
      const expiryDate = new Date()
      expiryDate.setFullYear(expiryDate.getFullYear() + 1)

      const { data: credit, error: creditError } = await supabase
        .from('class_credits')
        .insert({
          org_id,
          student_id,
          total_hours: class_credits.hours,
          used_hours: 0,
          remaining_hours: class_credits.hours,
          expiry_date: expiryDate.toISOString().split('T')[0],
          status: 'active',
        })
        .select()
        .single()

      if (creditError) {
        console.error('Credit insert error:', creditError)
        return Response.json({ error: creditError.message }, { status: 500 })
      }
      creditId = credit.id
    }

    // 2. Create Study Room Pass if provided
    if (study_room_pass && study_room_pass.amount > 0) {
      const startDate = new Date().toISOString().split('T')[0]
      let expiryDate: string

      if (study_room_pass.type === 'days') {
        const expiry = new Date()
        expiry.setDate(expiry.getDate() + study_room_pass.amount)
        expiryDate = expiry.toISOString().split('T')[0]
      } else {
        const expiry = new Date()
        expiry.setFullYear(expiry.getFullYear() + 1)
        expiryDate = expiry.toISOString().split('T')[0]
      }

      const { data: pass, error: passError } = await supabase
        .from('study_room_passes')
        .insert({
          org_id,
          student_id,
          pass_type: study_room_pass.type,
          total_amount: study_room_pass.amount,
          remaining_amount: study_room_pass.amount,
          start_date: startDate,
          expiry_date: expiryDate,
          status: 'active',
        })
        .select()
        .single()

      if (passError) {
        console.error('Pass insert error:', passError)
        return Response.json({ error: passError.message }, { status: 500 })
      }
      passId = pass.id
    }

    // 3. Create Payment Record
    const { data: payment, error: paymentError } = await supabase
      .from('payment_records')
      .insert({
        org_id,
        student_id,
        student_name,
        amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method,
        revenue_category_id,
        revenue_category_name,
        granted_credits_hours: class_credits?.hours || null,
        granted_credits_id: creditId,
        granted_pass_type: study_room_pass?.type || null,
        granted_pass_amount: study_room_pass?.amount || null,
        granted_pass_id: passId,
        status: 'completed',
        notes,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment insert error:', paymentError)
      return Response.json({ error: paymentError.message }, { status: 500 })
    }

    // Update credit and pass with payment_id
    if (creditId) {
      await supabase.from('class_credits').update({ payment_id: payment.id }).eq('id', creditId)
    }
    if (passId) {
      await supabase.from('study_room_passes').update({ payment_id: payment.id }).eq('id', passId)
    }

    return Response.json({
      success: true,
      payment,
      credit_id: creditId,
      pass_id: passId,
    })
  } catch (error) {
    console.error('Payment API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
