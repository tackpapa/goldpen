export const runtime = 'edge'

import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

interface PaymentBody {
  org_id: string
  student_id: string
  student_name: string
  amount: number
  payment_method: string
  revenue_category_id?: string
  revenue_category_name?: string
  class_credits?: { hours: number }
  study_room_pass?: { type: 'hours' | 'days'; amount: number }
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body = await request.json() as PaymentBody

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

    // 1. Update Student Credit if provided
    if (class_credits && class_credits.hours > 0) {
      const { data: student } = await supabase
        .from('students')
        .select('credit')
        .eq('id', student_id)
        .single()

      const newCredit = (student?.credit || 0) + class_credits.hours

      const { error: creditError } = await supabase
        .from('students')
        .update({ credit: newCredit })
        .eq('id', student_id)

      if (creditError) {
        console.error('Credit update error:', creditError)
        return Response.json({ error: creditError.message }, { status: 500 })
      }
    }

    // 2. Update Student Seats Remaining Time if provided
    if (study_room_pass && study_room_pass.amount > 0) {
      const { data: student } = await supabase
        .from('students')
        .select('seatsremainingtime')
        .eq('id', student_id)
        .single()

      // Convert to minutes
      const minutesToAdd = study_room_pass.type === 'hours'
        ? study_room_pass.amount * 60
        : study_room_pass.amount * 24 * 60

      const newTime = (student?.seatsremainingtime || 0) + minutesToAdd

      const { error: passError } = await supabase
        .from('students')
        .update({ seatsremainingtime: newTime })
        .eq('id', student_id)

      if (passError) {
        console.error('Pass update error:', passError)
        return Response.json({ error: passError.message }, { status: 500 })
      }
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
        granted_pass_type: study_room_pass?.type || null,
        granted_pass_amount: study_room_pass?.amount || null,
        status: 'completed',
        notes,
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment insert error:', paymentError)
      return Response.json({ error: paymentError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      payment,
    })
  } catch (error) {
    console.error('Payment API error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
