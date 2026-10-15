from exokortex.capture import chunk_text


def test_short_text_is_one_chunk():
    assert chunk_text("hello world", 100) == ["hello world"]


def test_paragraphs_pack_until_limit():
    text = "aaaa\n\nbbbb\n\ncccc"
    assert chunk_text(text, 10) == ["aaaa\n\nbbbb", "cccc"]


def test_long_paragraph_is_hard_split():
    chunks = chunk_text("x" * 25, 10)
    assert chunks == ["x" * 10, "x" * 10, "x" * 5]
    assert all(len(c) <= 10 for c in chunks)


def test_blank_input_has_no_chunks():
    assert chunk_text("  \n\n  ", 10) == []