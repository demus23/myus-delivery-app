// pages/api/user/stores.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { dbConnect } from "@/lib/mongoose";
import User from "@/lib/models/User";
import type { IUser, IStore } from "@/lib/models/User";

type UserStoresLean = Pick<IUser, "_id" | "stores"> & { _id: string; stores?: IStore[] };

// Payloads you might send from the client
type StoreInput = {
  name: string;
  // your UI might send either 'url' or 'domain'; we normalize to 'domain'
  url?: string;
  domain?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { userId } = req.query;
  if (typeof userId !== "string" || !userId) {
    return res.status(400).json({ message: "Missing or invalid userId" });
  }

  try {
    switch (req.method) {
      case "GET": {
        const user = await User.findById(userId)
          .select({ stores: 1 })
          .lean<UserStoresLean | null>()
          .exec();

        if (!user) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(user.stores ?? []);
      }

      case "POST": {
        const body = req.body as StoreInput;
        if (!body?.name || typeof body.name !== "string") {
          return res.status(400).json({ message: "Field 'name' is required" });
        }
        const domain = body.domain ?? body.url ?? undefined;

        const updated = await User.findByIdAndUpdate(
          userId,
          { $push: { stores: { name: body.name, ...(domain ? { domain } : {}) } } },
          {
            new: true,
            runValidators: true,
            projection: { stores: 1 },
          }
        )
          .lean<UserStoresLean | null>()
          .exec();

        if (!updated) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(updated.stores ?? []);
      }

      // Optional: update a specific store by its _id
      case "PUT": {
        const { storeId } = req.query;
        if (typeof storeId !== "string" || !storeId) {
          return res.status(400).json({ message: "Missing storeId" });
        }
        const body = req.body as StoreInput;
        const domain = body.domain ?? body.url ?? undefined;

        const updated = await User.findOneAndUpdate(
          { _id: userId, "stores._id": storeId },
          {
            $set: {
              "stores.$.name": body.name,
              ...(domain ? { "stores.$.domain": domain } : {}),
            },
          },
          {
            new: true,
            runValidators: true,
            projection: { stores: 1 },
          }
        )
          .lean<UserStoresLean | null>()
          .exec();

        if (!updated) return res.status(404).json({ message: "User or store not found" });
        return res.status(200).json(updated.stores ?? []);
      }

      // Optional: delete a specific store by its _id
      case "DELETE": {
        const { storeId } = req.query;
        if (typeof storeId !== "string" || !storeId) {
          return res.status(400).json({ message: "Missing storeId" });
        }

        const updated = await User.findByIdAndUpdate(
          userId,
          { $pull: { stores: { _id: storeId } } },
          {
            new: true,
            projection: { stores: 1 },
          }
        )
          .lean<UserStoresLean | null>()
          .exec();

        if (!updated) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(updated.stores ?? []);
      }

      default: {
        res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
        return res.status(405).json({ message: "Method Not Allowed" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
