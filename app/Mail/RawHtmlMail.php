<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;

class RawHtmlMail extends Mailable
{
    public function __construct(public readonly string $htmlBody, string $mailSubject)
    {
        $this->subject($mailSubject);
    }

    public function build(): self
    {
        return $this->html($this->htmlBody);
    }
}
