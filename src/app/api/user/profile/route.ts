import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        subscription: true,
        context: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Return safe user data (excluding sensitive fields)
    const profile = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      age: user.age,
      city: user.city,
      state: user.state,
      country: user.country,
      isSubscribed: user.isSubscribed,
      subscription: user.subscription ? {
        status: user.subscription.status,
        currentPeriodEnd: user.subscription.currentPeriodEnd,
      } : null,
      createdAt: user.createdAt,
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("User profile API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { phone, name, gender, age, city, state, country } = body

    // Validate phone number format if provided
    if (phone && !/^\+\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        { error: "Phone number must be in format +1234567890 (10-15 digits)" },
        { status: 400 }
      )
    }

    // Check if phone number is already taken by another user
    if (phone) {
      const existingUser = await prisma.user.findFirst({
        where: {
          phone: phone,
          email: { not: session.user.email }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: "This phone number is already associated with another account" },
          { status: 400 }
        )
      }
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        ...(phone !== undefined && { phone }),
        ...(name !== undefined && { name }),
        ...(gender !== undefined && { gender }),
        ...(age !== undefined && { age }),
        ...(city !== undefined && { city }),
        ...(state !== undefined && { state }),
        ...(country !== undefined && { country }),
      },
      include: {
        subscription: true,
      },
    })

    // Return updated profile data
    const profile = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      phone: updatedUser.phone,
      gender: updatedUser.gender,
      age: updatedUser.age,
      city: updatedUser.city,
      state: updatedUser.state,
      country: updatedUser.country,
      isSubscribed: updatedUser.isSubscribed,
      subscription: updatedUser.subscription ? {
        status: updatedUser.subscription.status,
        currentPeriodEnd: updatedUser.subscription.currentPeriodEnd,
      } : null,
      createdAt: updatedUser.createdAt,
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Update profile API error:", error)
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    )
  }
}