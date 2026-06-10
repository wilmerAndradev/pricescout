import os
import sys
import inspect

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import auth to load env first
import auth

from tasks.jobs import run_autonomous_search

print("run_autonomous_search:", run_autonomous_search)
print("run_autonomous_search.run:", run_autonomous_search.run)

# Is it a bound method?
is_method = inspect.ismethod(run_autonomous_search.run)
print("Is method?", is_method)

# Let's try calling inspect.getfullargspec
try:
    print("Argspec:", inspect.getfullargspec(run_autonomous_search.run))
except Exception as e:
    print("Argspec error:", e)
