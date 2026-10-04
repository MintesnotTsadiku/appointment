"""Code-owned, clearly labeled content examples for authorized private previews."""

from appointment.public_experience.showcase_catalog import validate_showcase_catalog


def content_examples(recipe):
    catalog = validate_showcase_catalog()
    site = next(row for row in catalog["sites"].values() if row["recipe"] == recipe.key)
    asset = site["supportAssets"][0]["asset"]
    common = {"locale": "en", "templateCompatVersion": str(recipe.version),
              "releaseHash": "private-example-" + recipe.key, "publishedAt": ""}
    article = {**common, "route": "/blog/preview-example", "title": "Example article",
               "excerpt": "Private layout example. Replace this with your own article before publishing.",
               "author": "Preview example", "hero": asset}
    article["projection"] = {"title": article["title"], "excerpt": article["excerpt"],
                             "author": article["author"], "blocks": [
                                 {"type": "heading", "level": 2, "html": "Your next story"},
                                 {"type": "paragraph", "html": "This example shows the article layout. It is not a published claim about your business."}]}
    article["seo"] = {"title": article["title"]}
    gallery = {**common, "route": "/gallery/preview-example", "title": "Example collection",
               "summary": "Private layout example with a project-owned fictional image.", "cover": asset}
    gallery["projection"] = {"title": gallery["title"], "summary": gallery["summary"], "items": [
        {"mediaType": "image", "image": asset, "altText": "Fictional showcase image used for a private template preview",
         "caption": "Example only. Add your own image, alt text, and consent before publication.",
         "credit": "Project-generated showcase image", "focalX": 50, "focalY": 50}]}
    gallery["seo"] = {"title": gallery["title"]}
    return {"article": article, "gallery": gallery}
