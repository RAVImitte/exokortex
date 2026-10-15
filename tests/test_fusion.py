from exokortex.retrieval import fuse


def test_items_in_both_rankings_win():
    fused = [key for key, _ in fuse(["a", "b", "c"], ["c", "a", "d"])]
    assert fused[:2] == ["a", "c"]
    assert set(fused) == {"a", "b", "c", "d"}


def test_single_ranking_keeps_order():
    assert [key for key, _ in fuse([3, 1, 2])] == [3, 1, 2]


def test_no_rankings():
    assert fuse() == []