import { User, type UserRecord } from "@honote/db";

import { toProfile } from "./profile";
import { totalPages } from "./schemas/page";

export async function usersByInterest(input: { page: number; limit: number }) {
  const { page, limit } = input;
  const skip = (page - 1) * limit;
  const [facet] = await User.collection
    .aggregate<MembershipFacet>([
      { $addFields: { interest: "$interests" } },
      { $unwind: "$interest" },
      {
        $group: {
          _id: { interest: "$interest", userId: "$_id" },
          user: {
            $first: {
              _id: "$_id",
              email: "$email",
              displayName: "$displayName",
              role: "$role",
              interests: "$interests",
              createdAt: "$createdAt",
              updatedAt: "$updatedAt",
            },
          },
        },
      },
      { $sort: { "_id.interest": 1, "user.email": 1 } },
      {
        $facet: {
          items: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: "count" }],
        },
      },
    ])
    .toArray();
  const total = facet?.total[0]?.count ?? 0;
  return {
    items: (facet?.items ?? []).map((item) => ({
      interest: item._id.interest,
      user: toProfile(item.user),
    })),
    page,
    limit,
    total,
    totalPages: totalPages(total, limit),
  };
}

type MembershipFacet = {
  items: Array<{
    _id: { interest: string; userId: UserRecord["_id"] };
    user: UserRecord;
  }>;
  total: Array<{ count: number }>;
};
