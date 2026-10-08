import asyncio
import json
import os

import torch
import tinker
from tinker import TensorData


MODEL_NAME = "Qwen/Qwen3.5-4B"
DATA_PATH = "tinker/training_data.jsonl"


def load_data():
    examples = []

    with open(DATA_PATH, "r", encoding="utf-8") as file:
        for line in file:
            if line.strip():
                examples.append(json.loads(line))

    return examples


def make_datum(tokenizer, example):
    prompt = example["input"]
    answer = example["output"]

    text = f"""You are TouchGrass AI.

Your purpose is to help people spend meaningful time outdoors.

User request:
{prompt}

Create one safe, specific, screen-free outdoor mission.

Assistant:
{answer}"""

    tokens = tokenizer.encode(text)

    if len(tokens) < 2:
        raise ValueError("Example produced too few tokens.")

    model_input = tinker.ModelInput.from_ints(tokens[:-1])

    target_tokens = tokens[1:]
    weights = [1.0] * len(target_tokens)

    return tinker.Datum(
        model_input=model_input,
        loss_fn_inputs={
            "target_tokens": TensorData.from_torch(
                torch.tensor(target_tokens, dtype=torch.long)
            ),
            "weights": TensorData.from_torch(
                torch.tensor(weights, dtype=torch.float32)
            ),
        },
    )


async def main():
    if not os.environ.get("TINKER_API_KEY"):
        raise RuntimeError(
            "TINKER_API_KEY is not set."
        )

    examples = load_data()

    print(f"Loaded {len(examples)} training examples.")
    print(f"Base model: {MODEL_NAME}")

    service_client = tinker.ServiceClient()

    print("Creating LoRA training client...")

    training_client = (
        await service_client.create_lora_training_client_async(
            base_model=MODEL_NAME,
            rank=16,
        )
    )

    tokenizer = training_client.get_tokenizer()

    data = [
        make_datum(tokenizer, example)
        for example in examples
    ]

    print(f"Prepared {len(data)} training examples.")
    print("Starting training...")

    for step in range(10):
        batch = data[step % len(data)]

        fb_future = await training_client.forward_backward_async(
            [batch],
            loss_fn="cross_entropy",
        )

        result = await fb_future.result_async()

        optim_future = await training_client.optim_step_async(
            tinker.AdamParams(
                learning_rate=1e-4
            )
        )

        await optim_future.result_async()

        print(
            f"Step {step + 1}/10 completed"
        )

        print()
    print("Training complete.")
    print("Saving trained weights...")

    checkpoint_future = await training_client.save_weights_for_sampler_async(
    name="touchgrass-v1",
    user_metadata={
        "project": "TouchGrass AI",
        "purpose": "Outdoor mission generation",
        "base_model": MODEL_NAME,
    },
)

checkpoint = await checkpoint_future.result_async()
    print(f"Sampler checkpoint saved: {checkpoint.path}")
    print(f"Playground URL: {checkpoint.get_playground_url()}")
    print(f"Console URL: {checkpoint.get_console_url()}")


if __name__ == "__main__":
    asyncio.run(main())