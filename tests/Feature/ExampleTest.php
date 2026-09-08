<?php

test('returns a successful response for login', function () {
    $response = $this->get(route('login'));

    $response->assertOk();
});
