/**
 * POST /api/submit
 * Requires a Cloudflare Pages Functions project with an R2 binding named `demodata`.
 */
export async function onRequestPost({ request, env }) {
	try {
	  const form = await request.formData();
  
	  // Convert FormData to JSON (supports multiple values per key)
	  const output = {};
	  for (const [key, value] of form) {
		const prior = output[key];
  
		// Represent File values with basic metadata so the JSON is serializable
		const normalized =
		  value instanceof File
			? { name: value.name, size: value.size, type: value.type }
			: value;
  
		if (prior === undefined) {
		  output[key] = normalized;
		} else {
		  output[key] = Array.isArray(prior) ? prior.concat(normalized) : [prior, normalized];
		}
	  }
  
	  const pretty = JSON.stringify(output, null, 2);
  
	  // Build an R2 object key using the current timestamp
	  const objectKey = `submissions/${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  
	  // Upload to R2
	  const putResult = await env.demodata.put(objectKey, pretty, {
		httpMetadata: { contentType: 'application/json; charset=utf-8' },
	  });
  
	  // Return the same JSON to the client, plus helpful headers
	  return new Response(pretty, {
		headers: {
		  'Content-Type': 'application/json;charset=utf-8',
		  'X-R2-Key': objectKey,
		  ...(putResult?.etag ? { ETag: putResult.etag } : {}),
		},
	  });
	} catch (err) {
	  return new Response('Error parsing or storing JSON content', { status: 400 });
	}
  }
  