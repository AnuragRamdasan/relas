import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const data = await request.json()
    const { gender, age, ethnicity, city, state, country, phone } = data

    // Update user with onboarding data
    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        gender,
        age: parseInt(age),
        ethnicity,
        city,
        state,
        country,
        phone,
      },
    })

    return NextResponse.json({ success: true, user: updatedUser })
  } catch (error) {
    console.error("Onboarding error:", error)
    return NextResponse.json(
      { error: "Failed to update user data" },
      { status: 500 }
    )
  }
}