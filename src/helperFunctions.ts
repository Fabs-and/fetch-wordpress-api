import type { Media, Page, Post, PostParams } from './types';
import { fetchData, fetchPageBySlug } from './index';

/**
 * Builds an object containing endpoint parameters based on the provided fields and quantity.
 * @param {string[]} [fields] - The fields to include in the endpoint parameters.
 * @param {number} [quantity] - The number of items to fetch.
 * @returns {PostParams} An object containing the endpoint parameters.
 */
export function endpointParamsBuilder(
  fields?: string[],
  quantity?: number
): PostParams {
  const endpointParams: PostParams = {};

  if (Array.isArray(fields) && fields.length > 0) {
    const uniqueFields = [...new Set(fields)];
    endpointParams._fields = uniqueFields.join(',');
  }
  if (typeof quantity === 'number') {
    endpointParams.per_page = quantity;
  }

  return endpointParams;
}

/**
 * Constructs a URLSearchParams object from the provided endpoint parameters.
 * @param {PostParams} endpointParams - The endpoint parameters to convert into a query string.
 * @returns {URLSearchParams} A URLSearchParams object containing the query parameters.
 */
export function queryBuilder(endpointParams: PostParams) {
  // create an empty URLSearchParams object
  const query = new URLSearchParams();

  // loop through the endpointParams object and append each key-value pair to the query
  for (const [key, value] of Object.entries(endpointParams)) {
    query.append(key, value as string);
  }

  return query;
}

/**
 * Extracts the slug from a given URL.
 * @param {string} link - The URL to extract the slug from.
 * @returns {string} The extracted slug.
 */
export function slugExtractor(link: string) {
  return new URL(link).pathname.split('/')[1];
}

/**
 * Detects and resolves redirects in an array of posts.
 * @param {Post[]} posts - The array of posts to check for redirects.
 * @returns {Promise<Post[]>} A new array of posts with redirects resolved.
 */
export async function detectRedirects(posts: Post[]): Promise<Post[]> {
  const newPosts = await Promise.all(
    posts.map(async (post) => {
      try {
        const linkSlug = slugExtractor(post.link as string);
        if (post.slug !== linkSlug) {
          const redirectedPost = await fetchPageBySlug(linkSlug);

          if (redirectedPost && redirectedPost.length > 0) {
            redirectedPost[0] = {
              ...redirectedPost[0],
              categories: post.categories,
              image: post.image,
              title: {rendered: post.title.rendered},
            };
          }

          return redirectedPost;
        } else {
          return post;
        }
      } catch (error) {
        console.error('Error in detectRedirects:', error);
        return post;
      }
    })
  );

  return newPosts.flat() as Post[];
}

export async function addImagesToPost(data: Post[] | Page[]) { 

  if (data[0].image || data[0].featured_media === 0) return data;
   const postsWithImages = await Promise.all(
     data.map(async (post: Post | Page) => {
       try {
         const imageLink = await getImageLink(post.featured_media);
         post = { ...post, image: imageLink };
         return post;
       } catch (error) {
         console.error('Error in addImageToPost:', error);
         return post;
       }
     })
   );

   return postsWithImages;
}

export async function getImageLink(featured_media: number) {
  try {
    const imageMetaInfo = await fetchData<Media>(
      `${'media'}/${featured_media}`
    );

    const imageLink = imageMetaInfo[0].media_details.sizes.full.source_url;

    return imageLink;
  } catch (error) {
    console.error('Error in getImageLink:', error);
    throw error; // Propagate the error to the caller
  }
}


