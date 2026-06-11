# vhs tape → renders demo/loop.gif from the real, anonymized demo.
# Install vhs (https://github.com/charmbracelet/vhs), then:  vhs demo/demo.tape
#
# A neutral prompt is forced below so the recording shows no username or host.

Output demo/loop.gif

Set Shell bash
Set FontSize 18
Set Width 1180
Set Height 860
Set Padding 18
Set PlaybackSpeed 1.0

# Force a PII-free prompt before anything is shown. unset PROMPT_COMMAND so a
# user .bashrc can't re-inject `user@host` on each prompt.
Hide
Type "unset PROMPT_COMMAND; export PS1='$ '; clear" Enter
Show

Sleep 500ms
Type "bash demo/run-demo.sh" Sleep 400ms Enter

# Let the real loop play out (bootstrap → drift → block → self-correct → patterns).
Sleep 38s
