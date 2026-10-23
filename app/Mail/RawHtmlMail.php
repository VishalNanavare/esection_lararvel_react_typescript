<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;

class RawHtmlMail extends Mailable
{
    /**
     * @param  array<int, array{data: string, name: string, options?: array}>  $attachments
     */
    public function __construct(
        public readonly string $htmlBody,
        string $mailSubject,
        array $attachments = []
    ) {
        $this->subject($mailSubject);

        foreach ($attachments as $att) {
            $this->attachData($att['data'], $att['name'], $att['options'] ?? []);
        }
    }

    public function build(): self
    {
        return $this->html($this->htmlBody);
    }
}
