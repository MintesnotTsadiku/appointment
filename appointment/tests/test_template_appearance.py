"""Pure checks for curated appearance choices."""
from appointment.public_experience.design_compiler import compile_design
from appointment.public_experience.appearance import options
from appointment.public_experience.recipes import list_recipes
from appointment.public_experience.errors import DesignCompilationError


def run():
    count = 0
    for recipe in list_recipes():
        catalog = options(recipe)
        original = compile_design(recipe.key).as_dict()
        for palette in catalog["palettes"]:
            for font in catalog["fonts"]:
                design = compile_design(recipe.key, brand_inputs={"paletteChoice": palette["key"], "fontChoice": font["key"]}).as_dict()
                assert design["validation"]["ok"]
                assert design["layout"] == original["layout"]
                assert design["assets"] == original["assets"]
                assert set(design["typography"]["supportedScripts"]) >= {"latin", "ethiopic"}
                if palette["key"] == font["key"] == "default":
                    assert design["contentHash"] == original["contentHash"]
                count += 1
        for field in ("paletteChoice", "fontChoice"):
            try:
                compile_design(recipe.key, brand_inputs={field: "another-template"})
            except DesignCompilationError:
                pass
            else:
                raise AssertionError(f"Unknown {field} accepted")
    return {"combinations": count, "defaults_preserved": True}
