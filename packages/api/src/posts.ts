import { objectId, Post, User, type PostRecord } from "@honote/db";

import { forbidden, notFound } from "./http-error";
import { totalPages } from "./schemas/page";

export function pageRequest(input: { page?: number; limit?: number }) {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  return { page, limit, skip: (page - 1) * limit };
}

export function toPost(post: PostRecord, displayName: string) {
  return {
    id: post._id.toHexString(),
    authorId: post.authorId.toHexString(),
    displayName,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}

export async function listPosts(input: { page?: number; limit?: number }) {
  const { page, limit, skip } = pageRequest(input);
  const [posts, total] = await Promise.all([
    Post.find().sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
    Post.countDocuments(),
  ]);
  const names = await displayNames(posts.map((post) => post.authorId));
  return {
    items: posts.map((post) => toPost(post, names.get(post.authorId.toHexString()) ?? "")),
    page,
    limit,
    total,
    totalPages: totalPages(total, limit),
  };
}

export async function getPost(id: string) {
  const post = await Post.findById(id);
  if (!post) throw notFound("Post not found");
  const author = await User.findById(post.authorId).select("displayName");
  return toPost(post, author?.displayName ?? "");
}

export async function createPost(
  author: { _id: PostRecord["_id"]; displayName: string },
  input: { title: string; body: string },
) {
  const post = await Post.create({
    authorId: author._id,
    title: input.title,
    body: input.body,
  });
  return toPost(post, author.displayName);
}

export async function updatePost(
  author: { _id: PostRecord["_id"]; displayName: string },
  input: { id: string; title?: string; body?: string },
) {
  const post = await requireAuthor(input.id, author._id);
  if (input.title !== undefined) post.title = input.title;
  if (input.body !== undefined) post.body = input.body;
  await post.save();
  return toPost(post, author.displayName);
}

export async function deletePost(authorId: PostRecord["_id"], id: string) {
  const post = await requireAuthor(id, authorId);
  await post.deleteOne();
}

export async function postsByUser(input: { id: string; page?: number; limit?: number }) {
  const { page, limit, skip } = pageRequest(input);
  const rows = await User.aggregate<ByUserRow>([
    { $match: { _id: objectId(input.id) } },
    { $project: { displayName: 1 } },
    {
      $lookup: {
        from: "posts",
        let: { authorId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$authorId", "$$authorId"] } } },
          { $sort: { createdAt: -1, _id: -1 } },
          { $project: { authorId: 1, title: 1, body: 1, createdAt: 1, updatedAt: 1 } },
          {
            $facet: {
              items: [{ $skip: skip }, { $limit: limit }],
              total: [{ $count: "count" }],
            },
          },
        ],
        as: "pages",
      },
    },
  ]);
  const row = rows[0];
  if (!row) throw notFound("User not found");
  const facet = row.pages[0] ?? { items: [], total: [] };
  const total = facet.total[0]?.count ?? 0;
  const displayName = row.displayName;
  return {
    author: { id: row._id.toHexString(), displayName },
    items: facet.items.map((item) => toPost(item, displayName)),
    page,
    limit,
    total,
    totalPages: totalPages(total, limit),
  };
}

async function requireAuthor(id: string, authorId: PostRecord["_id"]) {
  const post = await Post.findById(id);
  if (!post) throw notFound("Post not found");
  if (post.authorId.toHexString() !== authorId.toHexString()) throw forbidden("Forbidden");
  return post;
}

async function displayNames(authorIds: PostRecord["_id"][]) {
  const users = await User.find({ _id: { $in: authorIds } }).select("displayName");
  return new Map(users.map((user) => [user._id.toHexString(), user.displayName]));
}

type ByUserRow = {
  _id: PostRecord["_id"];
  displayName: string;
  pages: Array<{
    items: PostRecord[];
    total: Array<{ count: number }>;
  }>;
};
