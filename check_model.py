import onnx

model = onnx.load(r"c:\Users\gistr\PycharmProjects\DOANTN\model\mobilefacenet_insightface_det.onnx")

print("--- INPUTS ---")
for input in model.graph.input:
    shape = []
    if input.type.tensor_type.shape:
        for dim in input.type.tensor_type.shape.dim:
            shape.append(dim.dim_value)
    print(f"Name: {input.name}, Shape: {shape}")

print("\n--- OUTPUTS ---")
for output in model.graph.output:
    shape = []
    if output.type.tensor_type.shape:
        for dim in output.type.tensor_type.shape.dim:
            shape.append(dim.dim_value)
    print(f"Name: {output.name}, Shape: {shape}")
