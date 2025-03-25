import { AtpAgent } from "@atproto/api";
import "bootstrap/dist/css/bootstrap.min.css";
import Image from "next/image";

interface Follower {
  did: string;
  handle: string;
  displayName: string;
  avatar: string;
  description: string;
}

async function getFollowers(handle: string): Promise<Follower[]> {
  const agent = new AtpAgent({
    service: "https://bsky.social",
  });

  await agent.login({
    identifier: "coilysiren.me",
    password: process.env.PASSWORD || "",
  });

  // Step 1: Resolve handle to DID
  const didResponse = await fetch(
    `https://bsky.social/xrpc/com.atproto.identity.resolveHandle?handle=${handle}`
  );
  const didData = await didResponse.json();
  if (!didData.did) {
    throw new Error("Failed to resolve handle to DID");
  }

  console.log(`Resolved DID: ${didData.did}`);

  // Step 2: Fetch the DID document to get the user's PDS instance
  const didDocResponse = await fetch(`https://plc.directory/${didData.did}`);
  const didDoc = await didDocResponse.json();

  const pdsEndpoint = didDoc?.service?.find(
    (service: { type: string }) => service.type === "AtprotoPersonalDataServer"
  )?.serviceEndpoint;
  if (!pdsEndpoint) {
    throw new Error("Failed to determine PDS endpoint");
  }

  // Step 3: Fetch user following from their PDS
  const reponse = await fetch(
    `${pdsEndpoint}/xrpc/app.bsky.graph.getFollows?actor=${didData.did}&limit=10`,
    {
      headers: {
        Authorization: `Bearer ${agent.session?.accessJwt}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!reponse.ok) {
    throw new Error("Failed to fetch");
  }

  const data = await reponse.json();
  return data.follows;
}

export default async function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <div className="container w-200 h-400 rounded-full">
          <h1 className="text-4xl font-bold text-center sm:text-left">
            <a href="https://bsky.app/profile/coilysiren.me">@coilysiren.me</a>
          </h1>
          <p className="text-lg text-center sm:text-left">
            Welcome to my bluesky application. I am a software engineer and I
            love to build things. I am currently working on a project that will
            help developers to build applications faster.
          </p>
          <ul className="flex flex-col gap-4 items-center sm:items-start">
            {((await getFollowers("coilysiren.me")) || []).map(
              (follower: Follower) => (
                <li key={follower.did} className="flex items-center gap-4">
                  <Image
                    src={follower.avatar}
                    alt={follower.displayName}
                    className="img-thumbnail"
                    width={120}
                    height={120}
                  />
                  <div className="flex flex-col">
                    <p>{follower.displayName}</p>
                    <a href={`https://bsky.app/profile/${follower.handle}`}>
                      <p>@{follower.handle}</p>
                    </a>
                    <p>{follower.description}</p>
                  </div>
                </li>
              )
            )}
          </ul>
        </div>
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center"></footer>
    </div>
  );
}
