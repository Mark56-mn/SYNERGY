import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FeedTabs } from "@/components/feed/FeedTabs";
import { MemberFeed } from "@/components/feed/MemberFeed";
import { EmptyState } from "@/components/ui/States";
import { getPostsService } from "@/modules/posts/provider";
import { getProfileService } from "@/modules/profile/provider";
import type { PostPageDto } from "@synergy/domain";
import { getCurrentSession } from "@/server/provider-access";

export const metadata: Metadata = { title: "Following" };

/** The following feed is per-viewer: never statically cached. */
export const dynamic = "force-dynamic";

/**
 * Following feed (TASK-008D).
 *
 * Anonymous visitors are sent to sign in. A signed-in member without a profile
 * gets an honest onboarding state instead of an empty feed that pretends they
 * follow nobody. Database failures render the existing unavailable state and
 * never substitute demonstration posts.
 */
export default async function FollowingPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login?next=%2Ffollowing");
  }

  let hasProfile = false;
  let profileCheckFailed = false;
  try {
    hasProfile = Boolean(await getProfileService().getOwnProfile(session));
  } catch {
    profileCheckFailed = true;
  }

  if (profileCheckFailed) {
    return (
      <div>
        <FeedTabs active="following" />
        <MemberFeed
          initial={{ posts: [], nextCursor: null }}
          signedIn
          unavailable
          scope="following"
        />
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div>
        <FeedTabs active="following" />
        <div className="px-4 pt-5 sm:px-5">
          <EmptyState
            title="Create your profile first"
            description="A profile is needed before you can follow creators and build a Following feed."
            action={
              <Link
                href="/onboarding"
                className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 text-sm font-semibold text-bg hover:bg-primary-hover"
              >
                Create your profile
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  let initial: PostPageDto = { posts: [], nextCursor: null };
  let unavailable = false;
  try {
    initial = await getPostsService().getFeed(session, {
      limit: 10,
      scope: "following",
    });
  } catch {
    unavailable = true;
  }

  return (
    <div>
      <FeedTabs active="following" />
      <MemberFeed
        initial={initial}
        signedIn
        unavailable={unavailable}
        scope="following"
      />
    </div>
  );
}
