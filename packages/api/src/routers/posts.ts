import type { UserRecord } from "@honote/db";

import { forbidden } from "../http-error";
import { authed } from "../middleware";
import { createPost, deletePost, getPost, listPosts, postsByUser, updatePost } from "../posts";
import {
  createPostInputSchema,
  postIdInputSchema,
  postPageSchema,
  postSchema,
  postsByUserInputSchema,
  postsByUserSchema,
  updatePostInputSchema,
} from "../schemas/post";
import { pageLimitInputSchema } from "../schemas/page";
import { publicProcedure } from "../index";

function requireUser(user: UserRecord | undefined) {
  if (!user) throw forbidden("Forbidden");
  return user;
}

export const postsRouter = {
  list: publicProcedure
    .route({ method: "GET", path: "/posts" })
    .input(pageLimitInputSchema)
    .output(postPageSchema)
    .handler(({ input }) => listPosts(input)),
  get: publicProcedure
    .route({ method: "GET", path: "/posts/{id}" })
    .input(postIdInputSchema)
    .output(postSchema)
    .handler(({ input }) => getPost(input.id)),
  create: authed
    .route({ method: "POST", path: "/posts", successStatus: 201 })
    .input(createPostInputSchema)
    .output(postSchema)
    .handler(({ input, context }) => createPost(requireUser(context.user), input)),
  update: authed
    .route({ method: "PATCH", path: "/posts/{id}" })
    .input(updatePostInputSchema)
    .output(postSchema)
    .handler(({ input, context }) => updatePost(requireUser(context.user), input)),
  delete: authed
    .route({ method: "DELETE", path: "/posts/{id}", successStatus: 204 })
    .input(postIdInputSchema)
    .handler(async ({ input, context }) => {
      await deletePost(requireUser(context.user)._id, input.id);
    }),
  byUser: publicProcedure
    .route({ method: "GET", path: "/users/{id}/posts" })
    .input(postsByUserInputSchema)
    .output(postsByUserSchema)
    .handler(({ input }) => postsByUser(input)),
};
